import { readFileSync } from "node:fs"
import { XMLParser } from "fast-xml-parser"
import { sql } from "drizzle-orm"
import { db } from "./index"

// Average urban speed per OSM highway type, used to turn length into a
// travel-time cost (seconds) for pgRouting. Rough defaults, not measured.
const SPEED_KMH: Record<string, number> = {
  motorway: 80,
  motorway_link: 50,
  trunk: 60,
  trunk_link: 40,
  primary: 50,
  primary_link: 40,
  secondary: 45,
  secondary_link: 35,
  tertiary: 40,
  tertiary_link: 30,
  unclassified: 30,
  residential: 25,
  living_street: 15,
  service: 15,
}

// Highway types a collection vehicle would actually be sent down.
// Motorway/trunk/link types are still imported (for graph connectivity)
// but left requires_collection = false.
const COLLECTION_TYPES = new Set([
  "residential",
  "service",
  "tertiary",
  "unclassified",
  "secondary",
  "primary",
  "living_street",
])

// Not part of the drivable road graph at all.
const EXCLUDED_TYPES = new Set([
  "footway",
  "path",
  "track",
  "cycleway",
  "construction",
  "proposed",
  "steps",
  "pedestrian",
  "services",
  "elevator",
  "corridor",
  "bridleway",
  "platform",
])

interface OsmTag {
  "@_k": string
  "@_v": string
}

interface OsmNode {
  "@_id": string
  "@_lat": string
  "@_lon": string
}

interface OsmWayNd {
  "@_ref": string
}

interface OsmWay {
  "@_id": string
  nd?: OsmWayNd | OsmWayNd[]
  tag?: OsmTag | OsmTag[]
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function tagsOf(el: { tag?: OsmTag | OsmTag[] }): Record<string, string> {
  const tags: Record<string, string> = {}
  for (const t of asArray(el.tag)) {
    if (t["@_k"] !== undefined && t["@_v"] !== undefined) {
      tags[t["@_k"]] = t["@_v"]
    }
  }
  return tags
}

interface StreetRow {
  osmId: number
  name: string | null
  highwayType: string
  oneway: boolean
  wkt: string
}

async function main() {
  const file = process.argv[2] ?? "./data/canoas.osm"
  console.log(`Reading ${file}...`)
  const xml = readFileSync(file, "utf-8")

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" })
  const doc = parser.parse(xml) as { osm: { node?: OsmNode | OsmNode[]; way?: OsmWay | OsmWay[] } }

  const nodes = new Map<string, { lat: number; lon: number }>()
  for (const n of asArray(doc.osm.node)) {
    nodes.set(n["@_id"], { lat: Number(n["@_lat"]), lon: Number(n["@_lon"]) })
  }
  console.log(`  ${nodes.size} nodes`)

  const ways = asArray(doc.osm.way)
  const includedWays = ways.filter((w) => {
    const highway = tagsOf(w).highway
    return highway !== undefined && !EXCLUDED_TYPES.has(highway)
  })

  // pgr_createTopology only merges edges at their start/end points — it does
  // not detect a way that crosses straight through another way's interior
  // node (e.g. a side street T-intersecting the middle of a long avenue).
  // So before handing this to pgRouting, split every way at each node it
  // shares with another included way, the same "noding" osm2pgrouting does.
  const nodeWayCount = new Map<string, number>()
  for (const w of includedWays) {
    const seen = new Set<string>()
    for (const nd of asArray(w.nd)) {
      const ref = nd["@_ref"]
      if (seen.has(ref)) continue
      seen.add(ref)
      nodeWayCount.set(ref, (nodeWayCount.get(ref) ?? 0) + 1)
    }
  }

  const rows: StreetRow[] = []

  for (const w of includedWays) {
    const tags = tagsOf(w)
    const highway = tags.highway!

    let refs = asArray(w.nd).map((nd) => nd["@_ref"])
    if (refs.length < 2) continue

    let onewayTag = (tags.oneway ?? "").toLowerCase()
    if (onewayTag === "-1") {
      refs = [...refs].reverse()
      onewayTag = "yes"
    }
    const oneway = onewayTag === "yes" || onewayTag === "true" || onewayTag === "1"

    const cutIndices = [0]
    for (let i = 1; i < refs.length - 1; i++) {
      if ((nodeWayCount.get(refs[i]) ?? 0) >= 2) cutIndices.push(i)
    }
    cutIndices.push(refs.length - 1)

    for (let s = 0; s < cutIndices.length - 1; s++) {
      const segRefs = refs.slice(cutIndices[s], cutIndices[s + 1] + 1)
      const coords: string[] = []
      for (const ref of segRefs) {
        const pt = nodes.get(ref)
        if (pt) coords.push(`${pt.lon} ${pt.lat}`)
      }
      if (coords.length < 2) continue

      rows.push({
        osmId: Number(w["@_id"]),
        name: tags.name ?? null,
        highwayType: highway,
        oneway,
        wkt: `LINESTRING(${coords.join(",")})`,
      })
    }
  }
  console.log(`  ${rows.length} street segments (from ${includedWays.length} routable ways of ${ways.length} total)`)

  console.log("Clearing existing streets...")
  await db.execute(sql`TRUNCATE TABLE route_streets, streets RESTART IDENTITY CASCADE`)

  console.log("Inserting...")
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = batch.map(
      (r) =>
        sql`(${r.osmId}, ${r.name}, ST_GeomFromText(${r.wkt}, 4326), ${COLLECTION_TYPES.has(r.highwayType)}, ${r.oneway}, ${r.highwayType})`
    )
    await db.execute(sql`
      INSERT INTO streets (osm_id, name, geom, requires_collection, oneway, highway_type)
      VALUES ${sql.join(values, sql`, `)}
    `)
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
  console.log()

  console.log("Building topology (pgr_createTopology)...")
  await db.execute(sql`SELECT pgr_createTopology('streets', 0.00001, 'geom', 'id')`)

  console.log("Computing length_km, cost, reverse_cost...")
  await db.execute(sql`UPDATE streets SET length_km = ST_Length(geom::geography) / 1000.0`)

  for (const [type, speed] of Object.entries(SPEED_KMH)) {
    await db.execute(sql`
      UPDATE streets SET cost = (length_km / ${speed}) * 3600
      WHERE highway_type = ${type}
    `)
  }
  await db.execute(sql`UPDATE streets SET cost = (length_km / 20) * 3600 WHERE cost IS NULL`)
  await db.execute(sql`UPDATE streets SET reverse_cost = CASE WHEN oneway THEN -1 ELSE cost END`)

  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Import failed:", err)
  process.exit(1)
})
