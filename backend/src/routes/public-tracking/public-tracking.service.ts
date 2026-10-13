import { sql } from "drizzle-orm"
import { db } from "../../db"
import { WEEKDAY_ORDER } from "../../lib/weekdays"
import { getTodayContext } from "../../lib/schedule"
import type { HouseSide } from "../../lib/street-side"
import { lineLatLngs, pointFromLatLng } from "../../lib/geometry"
import { normalizedStreetName, normalizeStreetText, parseStreetQuery } from "../../lib/street-search"
import { VehicleService } from "../vehicles/vehicle.service"
import { CooperativeService } from "../cooperatives/cooperative.service"

const vehicleService = new VehicleService()
const cooperativeService = new CooperativeService()

interface EtaRow {
  [key: string]: unknown
  status: "chegando" | "na_rua" | "passou" | "nao_esta_na_rota" | "sem_rota"
  seconds: number
  distance_km: number
  path_geojson: string | null
  stops_json: string | null
}

// "menos de 1 minuto" / "12 minutos" / "1h 5min"
export function formatEta(seconds: number): string {
  if (seconds < 60) return "menos de 1 minuto"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minutos`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

const MAX_SEARCH_RESULTS = 8
// Segments of one name further apart than this (~500m, in degrees) are
// treated as different streets that happen to share it ("Rua 1" exists in
// several loteamentos) and listed separately.
const SAME_STREET_GAP_DEG = 0.005

interface StreetSearchRow {
  [key: string]: unknown
  name: string
  lat: number
  lng: number
  neighborhoods: string[] | null
  cross_street: string | null
}

interface VehicleSummary {
  id: string
  plate: string | null
  model: string | null
  color: string | null
  type: string
}

interface ScheduleCandidate {
  routeId: string
  vehicleId: string
  startTime: string
  daysAhead: number
  vehicle: VehicleSummary
}

interface CoveringStopRow {
  [key: string]: unknown
  route_id: string
  vehicle_id: string
  start_time: string
  days_of_week: string[]
  side: string
  plate: string | null
  model: string | null
  color: string | null
  type: string
}

// A citizen's house pin plus the street segment and side they confirmed
// for it (see resolveAddressStreet).
export interface AddressPoint {
  lat: number
  lng: number
  streetId: number
  side: HouseSide
}

export class PublicTrackingService {
  // Street-name search over our own `streets` table (see lib/street-search.ts
  // for why it isn't Nominatim). Only street-level: the OSM extract has
  // almost no house numbers, so the citizen then taps their house on the map.
  // Best-matching names are picked first, then each is split into the
  // separate places it occurs in, each with the bairros it runs through.
  // Bairros can be typed too ("rua 1 mathias velho"): each query word must
  // match either the street name or the segment's bairro (precomputed in
  // streets.neighborhood_names). When two places share a name and bairro, a
  // cross street tells them apart.
  async geocode(query: string) {
    const { tokens, required } = parseStreetQuery(query)
    if (tokens.length === 0) return []

    const mustMatch = sql.join(
      required.map((t) => sql`(norm LIKE ${`%${t}%`} OR hood_norm LIKE ${`%${t}%`})`),
      sql` AND `
    )
    const nameHits = sql.join(
      tokens.map((t) => sql`(norm ~ ${`\\m${t}`})::int`),
      sql` + `
    )
    const tokenArray = sql`ARRAY[${sql.join(
      tokens.map((t) => sql`${t}`),
      sql`, `
    )}]::text[]`
    const result = await db.execute<StreetSearchRow>(sql`
      WITH matches AS (
        SELECT * FROM (
          SELECT s.name, s.geom, s.length_km, s.neighborhood_names,
                 ${normalizedStreetName(sql`s.name`)} AS norm,
                 ${normalizedStreetName(sql`coalesce(array_to_string(s.neighborhood_names, ' '), '')`)} AS hood_norm
          FROM streets s
          WHERE s.name IS NOT NULL
        ) named
        WHERE ${mustMatch}
      ),
      scored_names AS (
        SELECT norm,
               ${nameHits} AS name_hits,
               -- words of the name past its type ("rua", "avenida"…) that
               -- weren't typed: "rua 1" puts "Rua 1" before "Rua 13"
               (SELECT count(*) FROM unnest((string_to_array(norm, ' '))[2:]) w
                WHERE w <> ALL (${tokenArray})) AS extra_words,
               sum(length_km) AS total_km
        FROM matches
        GROUP BY norm
      ),
      best_names AS (
        SELECT * FROM scored_names
        -- a name with fewer of the typed words in it than the best one only
        -- got here through its bairro or "rua" ("rua 13" → not "Rua Dique")
        WHERE name_hits = (SELECT max(name_hits) FROM scored_names)
        ORDER BY extra_words ASC, total_km DESC
        LIMIT ${MAX_SEARCH_RESULTS}
      ),
      clustered AS (
        SELECT m.*, ST_ClusterDBSCAN(m.geom, ${SAME_STREET_GAP_DEG}, 1) OVER (PARTITION BY m.norm) AS cluster
        FROM matches m
        JOIN best_names b USING (norm)
      ),
      places AS (
        SELECT norm, cluster,
               -- spelling variants share a norm; show the dominant one
               (array_agg(name ORDER BY length_km DESC))[1] AS name,
               ST_Collect(geom) AS geom,
               sum(length_km) AS km,
               count(*) OVER (PARTITION BY norm) AS places_with_name
        FROM clustered
        GROUP BY norm, cluster
      )
      SELECT p.name, ST_Y(c.point) AS lat, ST_X(c.point) AS lng,
             -- bairros the place runs through, the one with most of it first
             (SELECT array_agg(h.name ORDER BY h.km DESC, h.name)
              FROM (SELECT hood AS name, sum(cl.length_km) AS km
                    FROM clustered cl, unnest(cl.neighborhood_names) hood
                    WHERE cl.norm = p.norm AND cl.cluster = p.cluster
                    GROUP BY hood) h) AS neighborhoods,
             CASE WHEN p.places_with_name > 1 THEN (
               SELECT x.name
               FROM streets x
               WHERE x.name IS NOT NULL
                 AND ST_Intersects(x.geom, p.geom)
                 -- not the same name under another type ("Rua X" / "Avenida X")
                 AND regexp_replace(${normalizedStreetName(sql`x.name`)}, '^[a-z]+ ', '')
                     <> regexp_replace(p.norm, '^[a-z]+ ', '')
               ORDER BY CASE x.highway_type
                          WHEN 'primary' THEN 0 WHEN 'secondary' THEN 1 WHEN 'tertiary' THEN 2 ELSE 3
                        END,
                        x.length_km DESC
               LIMIT 1
             ) END AS cross_street
      FROM places p
      JOIN best_names b USING (norm)
      -- a point on the street itself, near its middle, for the map to focus on
      CROSS JOIN LATERAL (SELECT ST_ClosestPoint(p.geom, ST_Centroid(p.geom)) AS point) c
      ORDER BY b.extra_words ASC, b.total_km DESC, p.km DESC
      LIMIT ${MAX_SEARCH_RESULTS}
    `)

    const results = result.rows.map((r) => ({
      label: r.name,
      lat: r.lat,
      lng: r.lng,
      road: r.name,
      neighborhoods: r.neighborhoods ?? [],
      crossStreet: r.cross_street,
    }))
    // The bairro alone already tells most same-named places apart; keep the
    // cross street only where it doesn't.
    const placeKey = (r: (typeof results)[number]) => `${r.label}|${r.neighborhoods.join(",")}`
    const sameKey = new Map<string, number>()
    for (const r of results) sameKey.set(placeKey(r), (sameKey.get(placeKey(r)) ?? 0) + 1)
    return results.map((r) => ({ ...r, crossStreet: sameKey.get(placeKey(r))! > 1 ? r.crossStreet : null }))
  }

  // Cooperative pins for the pre-login public map — no auth here, so only
  // routine directory fields (no cnpj/active/timestamps) are exposed.
  async listActiveCooperatives() {
    const coops = await cooperativeService.findActiveWithCoordinates()
    return coops.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      instagram: c.instagram,
      lat: c.lat as number,
      lng: c.lng as number,
    }))
  }

  // Which segment a citizen's house pin belongs to. Prefers segments of the
  // street they searched for (`road`) — right at a corner the pin is often
  // literally closer to the crossing street — and only then falls back to
  // whatever is nearest. `side` is just a suggestion from the pin's
  // position; the citizen confirms (or flips) it on screen.
  async resolveAddressStreet(lat: number, lng: number, road?: string) {
    const point = pointFromLatLng(lat, lng)
    const maxDistanceMeters = 100
    // (Postgres rejects a bare constant like `false` in ORDER BY, so the
    // same-road preference is left out entirely when there's no road.)
    const sameRoadFirst = road
      ? sql`(${normalizedStreetName(sql`s.name`)} = ${normalizeStreetText(road)}) IS TRUE DESC,`
      : sql``
    const result = await db.execute<{
      street_id: number
      name: string | null
      line: [number, number][]
      side: HouseSide | null
    }>(sql`
      SELECT s.id AS street_id, s.name, ${lineLatLngs(sql`s.geom`)} AS line, street_side(s.geom, ${point}) AS side
      FROM streets s
      WHERE ST_DWithin(s.geom::geography, ${point}::geography, ${maxDistanceMeters})
      ORDER BY ${sameRoadFirst} s.geom <-> ${point}
      LIMIT 1
    `)
    const row = result.rows[0]
    if (!row) return null
    return { streetId: row.street_id, name: row.name, line: row.line, side: row.side }
  }

  async checkAddress({ lat, lng, streetId, side }: AddressPoint) {
    const street = await this.findStreet(streetId)
    if (!street) return { status: "no_route" as const }

    const { today, nowTime } = await getTodayContext()
    const coveringStops = await this.findStopsCoveringPoint(streetId, lat, lng)
    const schedule = pickNextOccurrence(
      coveringStops.filter((s) => s.side === "both" || s.side === side),
      today
    )

    if (!schedule) {
      // Whatever's left collects this exact stretch, only the opposite side.
      const otherSide = pickNextOccurrence(coveringStops, today)
      if (otherSide) {
        return {
          status: "other_side_only" as const,
          street: street.name,
          daysAhead: otherSide.daysAhead,
          startTime: otherSide.startTime,
        }
      }
      return { status: "no_route" as const, street: street.name }
    }

    if (schedule.daysAhead > 0) {
      return {
        status: "scheduled_future" as const,
        street: street.name,
        daysAhead: schedule.daysAhead,
        startTime: schedule.startTime,
        vehicle: schedule.vehicle,
      }
    }

    if (nowTime < schedule.startTime) {
      return {
        status: "scheduled_today" as const,
        street: street.name,
        startTime: schedule.startTime,
        vehicle: schedule.vehicle,
      }
    }

    // Window has started today — the live "how close is it" walks this exact
    // route (get_eta_following_route in 005-maps.sql). Passing the side keeps
    // it from counting a pass that collects the other side of the block as
    // "the citizen's street".
    const eta = await this.getEta(schedule.routeId, { lat, lng, streetId, side })

    if (eta.status === "chegando" || eta.status === "na_rua") {
      return {
        status: "arriving" as const,
        street: street.name,
        etaStatus: eta.status,
        etaSeconds: eta.seconds,
        etaText: formatEta(eta.seconds),
        distanceKm: eta.distanceKm,
        vehicle: schedule.vehicle,
        position: await vehicleService.findLatestPosition(schedule.vehicleId),
        path: eta.path,
        stops: eta.stops,
      }
    }

    if (eta.status === "passou") {
      const passedApproxAt = await this.findApproxPassTime(schedule.vehicleId, streetId)
      return {
        status: "passed" as const,
        street: street.name,
        vehicle: schedule.vehicle,
        passedApproxAt,
      }
    }

    // eta is 'nao_esta_na_rota' / 'sem_rota', or the vehicle has no GPS
    // positions posted yet today — fall back to "scheduled today" instead of
    // surfacing a confusing/unrelated eta error.
    return {
      status: "scheduled_today" as const,
      street: street.name,
      startTime: schedule.startTime,
      vehicle: schedule.vehicle,
    }
  }

  private async getEta(routeId: string, { lat, lng, streetId, side }: AddressPoint) {
    const result = await db.execute<EtaRow>(
      sql`SELECT * FROM get_eta_following_route(${routeId}, ${lat}, ${lng}, ${streetId}, ${side})`
    )
    const row = result.rows[0]
    // The path comes back as GeoJSON ([lng, lat] pairs) — flip to the app's {lat, lng}.
    const path = row.path_geojson
      ? (JSON.parse(row.path_geojson) as { coordinates: [number, number][] }).coordinates.map(([pLng, pLat]) => ({
          lat: pLat,
          lng: pLng,
        }))
      : []
    return {
      status: row.status,
      seconds: Number(row.seconds),
      distanceKm: Number(row.distance_km),
      path,
      stops: row.stops_json ? (JSON.parse(row.stops_json) as { streetId: number; name: string | null; lat: number; lng: number }[]) : [],
    }
  }

  private async findStreet(streetId: number): Promise<{ id: number; name: string | null } | null> {
    const result = await db.execute<{ id: number; name: string | null }>(
      sql`SELECT id, name FROM streets WHERE id = ${streetId}`
    )
    return result.rows[0] ?? null
  }

  // Every scheduled stop on this segment whose collected stretch includes
  // the pin — any side; checkAddress splits them by side. Connectors
  // (is_stop = false) are only driven through, never collected, so a
  // citizen on one isn't "served" by it.
  private async findStopsCoveringPoint(streetId: number, lat: number, lng: number) {
    const point = pointFromLatLng(lat, lng)
    const result = await db.execute<CoveringStopRow>(sql`
      SELECT cr.id AS route_id, cr.vehicle_id, cr.start_time, cr.days_of_week, rs.side,
             v.plate, v.model, v.color, v.type
      FROM route_streets rs
      JOIN streets s ON s.id = rs.street_id
      JOIN collection_routes cr ON cr.id = rs.route_id
      JOIN vehicles v ON v.id = cr.vehicle_id
      WHERE rs.street_id = ${streetId}
        AND rs.is_stop
        AND ST_LineLocatePoint(s.geom, ${point}) BETWEEN rs.start_fraction AND rs.end_fraction
        AND cr.days_of_week IS NOT NULL
        AND cr.start_time IS NOT NULL
    `)
    return result.rows
  }

  // Best-effort "when did it pass" for the "already collected" state: the
  // most recent position today that was within 50m of the citizen's street.
  private async findApproxPassTime(vehicleId: string, streetId: number): Promise<Date | null> {
    const result = await db.execute<{ passed_at: Date | null }>(sql`
      SELECT MAX(vp.recorded_at) AS passed_at
      FROM vehicle_positions vp, streets s
      WHERE vp.vehicle_id = ${vehicleId}
        AND s.id = ${streetId}
        AND vp.recorded_at::date = CURRENT_DATE
        AND ST_DWithin(vp.location::geography, s.geom::geography, 50)
    `)
    return result.rows[0]?.passed_at ?? null
  }
}

// The soonest upcoming occurrence (today counts) among recurring weekly
// routes — fewest days ahead first, then earliest start time.
function pickNextOccurrence(rows: CoveringStopRow[], today: string): ScheduleCandidate | null {
  const todayIndex = WEEKDAY_ORDER.indexOf(today)
  let best: ScheduleCandidate | null = null

  for (const row of rows) {
    let daysAhead = -1
    for (let offset = 0; offset < 7; offset++) {
      const candidateDay = WEEKDAY_ORDER[(todayIndex + offset) % 7]
      if (row.days_of_week.includes(candidateDay)) {
        daysAhead = offset
        break
      }
    }
    if (daysAhead === -1) continue

    const candidate: ScheduleCandidate = {
      routeId: row.route_id,
      vehicleId: row.vehicle_id,
      startTime: row.start_time,
      daysAhead,
      vehicle: { id: row.vehicle_id, plate: row.plate, model: row.model, color: row.color, type: row.type },
    }

    if (
      !best ||
      candidate.daysAhead < best.daysAhead ||
      (candidate.daysAhead === best.daysAhead && candidate.startTime < best.startTime)
    ) {
      best = candidate
    }
  }

  return best
}
