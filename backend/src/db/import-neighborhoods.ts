import { readFileSync } from "node:fs"
import { sql } from "drizzle-orm"
import { db } from "./index"
import { assignStreetNeighborhoods } from "./street-neighborhoods"

// Overpass `out geom` JSON (see data/README.md): each bairro is a boundary
// relation whose member ways carry their own coordinates.
interface OverpassMember {
  type: string
  role: string
  geometry?: { lat: number; lon: number }[]
}

interface OverpassRelation {
  type: string
  id: number
  tags?: Record<string, string>
  members?: OverpassMember[]
}

async function main() {
  const file = process.argv[2] ?? "./data/canoas-bairros.json"
  console.log(`Reading ${file}...`)
  const doc = JSON.parse(readFileSync(file, "utf-8")) as { elements: OverpassRelation[] }
  const relations = doc.elements.filter((e) => e.type === "relation" && e.tags?.name)
  console.log(`  ${relations.length} boundary relations`)

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE neighborhoods RESTART IDENTITY`)

    for (const rel of relations) {
      const name = rel.tags!.name
      // Outer and inner ways alike: ST_BuildArea stitches the rings back
      // together (a boundary is usually split across several ways) and turns
      // rings nested inside others into holes.
      const lines = (rel.members ?? [])
        .filter((m) => m.type === "way" && (m.role === "outer" || m.role === "inner") && m.geometry)
        .map((m) => `(${m.geometry!.map((p) => `${p.lon} ${p.lat}`).join(",")})`)
      if (lines.length === 0) {
        console.warn(`  skipped ${name}: no boundary ways`)
        continue
      }

      const inserted = await tx.execute<{ km2: number }>(sql`
        INSERT INTO neighborhoods (osm_id, name, geom)
        SELECT ${rel.id}, ${name}, ST_Multi(area)
        FROM (SELECT ST_BuildArea(ST_Union(ST_GeomFromText(${`MULTILINESTRING(${lines.join(",")})`}, 4326))) AS area) a
        WHERE area IS NOT NULL AND NOT ST_IsEmpty(area)
        RETURNING ST_Area(geom::geography) / 1e6 AS km2
      `)
      const row = inserted.rows[0]
      if (row) console.log(`  ${name} (${row.km2.toFixed(2)} km²)`)
      else console.warn(`  skipped ${name}: its boundary doesn't close into an area`)
    }

    console.log("Assigning streets to bairros...")
    await assignStreetNeighborhoods(tx)
  })

  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Import failed:", err)
  process.exit(1)
})
