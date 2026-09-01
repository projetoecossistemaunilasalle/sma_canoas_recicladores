import { sql } from "drizzle-orm"
import { db } from "../../db"
import { parseWktPoint } from "../../lib/geo"
import { VehicleService } from "../vehicles/vehicle.service"

const vehicleService = new VehicleService()

// Matches the day mapping used by get_eta_following_route() in
// docker/postgres/initdb/005-maps.sql (EXTRACT(ISODOW ...) 1=Monday..7=Sunday).
const WEEKDAY_ORDER = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]

const NOMINATIM_URL = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org/search"
// Approximate bounding box around Canoas, RS: left,top,right,bottom (lng,lat).
const CANOAS_VIEWBOX = "-51.24,-29.83,-51.02,-29.97"

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

export class PublicTrackingService {
  // Uses the public Nominatim API (OSM's free geocoder) biased to Canoas.
  // Fine for light/dev traffic; its usage policy caps ~1 req/s, so real
  // production volume should move to a self-hosted instance or paid provider.
  async geocode(query: string) {
    const url = new URL(NOMINATIM_URL)
    url.searchParams.set("q", query)
    url.searchParams.set("format", "jsonv2")
    url.searchParams.set("limit", "5")
    url.searchParams.set("countrycodes", "br")
    url.searchParams.set("viewbox", CANOAS_VIEWBOX)
    url.searchParams.set("bounded", "1")
    url.searchParams.set("addressdetails", "1")

    const res = await fetch(url, {
      headers: {
        "User-Agent": "reciclanoas-canoas/1.0 (+https://github.com/)",
        "Accept-Language": "pt-BR",
      },
    })
    if (!res.ok) return []

    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>
    return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lng: Number(d.lon) }))
  }

  async checkAddress(lat: number, lng: number) {
    const nearestAny = await this.findNearestStreet(lat, lng)
    const servedStreet = nearestAny ? await this.resolveServedStreet(lat, lng, nearestAny) : null
    const street = servedStreet ?? nearestAny
    if (!street) return { status: "no_route" as const }

    if (!servedStreet) return { status: "no_route" as const, street: street.name }

    const { today, nowTime } = await this.getTodayContext()
    const schedule = await this.findScheduleForStreet(street.id, today)
    if (!schedule) return { status: "no_route" as const, street: street.name }

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

    // Window has started today — delegate the live "how close is it" math to
    // the same DB function the authenticated ETA endpoint uses, rather than
    // re-deriving it.
    const eta = await vehicleService.getEta(schedule.vehicleId, lat, lng, street.id)

    if (eta && (eta.status === "chegando" || eta.status === "na_rua")) {
      const position = await vehicleService.findLatestPosition(schedule.vehicleId)
      return {
        status: "arriving" as const,
        street: street.name,
        etaStatus: eta.status,
        etaSeconds: eta.etaSeconds,
        etaText: eta.etaText,
        distanceKm: eta.distanceKm,
        vehicle: schedule.vehicle,
        position: position ? parsePosition(position) : null,
        path: eta.path,
        stops: eta.stops,
      }
    }

    if (eta && eta.status === "passou") {
      const passedApproxAt = await this.findApproxPassTime(schedule.vehicleId, street.id)
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

  private async findNearestStreet(lat: number, lng: number): Promise<{ id: number; name: string | null } | null> {
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)`
    const result = await db.execute<{ id: number; name: string | null }>(
      sql`SELECT id, name FROM streets ORDER BY geom <-> ${point} LIMIT 1`
    )
    return result.rows[0] ?? null
  }

  // Resolves the street segment that should represent this address for
  // schedule/route lookups. If the segment literally nearest the address is
  // itself served, use it directly. Otherwise, OSM sometimes splits one
  // continuous street into several short segments (one per intersection) —
  // the segment right at a corner can be unserved while the street
  // continues, served, just past that corner. Only treat this as that kind
  // of corner ambiguity (and bridge to a nearby served segment) when the
  // address itself sits near one END of its own unserved segment. If it
  // sits solidly mid-block, the street is genuinely not served there, even
  // if a same-named block elsewhere is — bridging on raw distance from the
  // address instead of this let a real ~230m-long unserved stretch of Rua
  // Charrua (address sitting mid-block, 115m from the nearest served
  // neighboring block) get wrongly reported as having collection.
  private async resolveServedStreet(
    lat: number,
    lng: number,
    nearestAny: { id: number; name: string | null }
  ): Promise<{ id: number; name: string | null } | null> {
    const own = await db.execute<{ id: number; name: string | null }>(sql`
      SELECT s.id, s.name FROM streets s
      JOIN route_streets rs ON rs.street_id = s.id
      WHERE s.id = ${nearestAny.id}
      LIMIT 1
    `)
    if (own.rows[0]) return own.rows[0]

    const cornerRadiusMeters = 40
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)`
    const corner = await db.execute<{ near_end: boolean }>(sql`
      SELECT LEAST(loc.f, 1 - loc.f) * ST_Length(s.geom::geography) < ${cornerRadiusMeters} AS near_end
      FROM streets s
      CROSS JOIN LATERAL (SELECT ST_LineLocatePoint(s.geom, ${point}) AS f) loc
      WHERE s.id = ${nearestAny.id}
    `)
    if (!corner.rows[0]?.near_end) return null

    return (
      (nearestAny.name ? await this.findNearestServedStreet(lat, lng, nearestAny.name) : null) ??
      (await this.findNearestServedStreet(lat, lng))
    )
  }

  // Same idea as findNearestStreet, but only considers segments that are
  // actually part of some route_streets row. Only called from
  // resolveServedStreet once a corner-ambiguity situation is already
  // confirmed, so a generous radius here just widens which neighboring
  // segment gets picked, not whether bridging happens at all.
  private async findNearestServedStreet(
    lat: number,
    lng: number,
    name?: string
  ): Promise<{ id: number; name: string | null } | null> {
    const point = sql`ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)`
    const maxDistanceMeters = 200
    const nameFilter = name ? sql`AND s.name = ${name}` : sql``
    const result = await db.execute<{ id: number; name: string | null }>(sql`
      SELECT s.id, s.name
      FROM streets s
      JOIN route_streets rs ON rs.street_id = s.id
      WHERE ST_DWithin(s.geom::geography, ${point}::geography, ${maxDistanceMeters})
        ${nameFilter}
      ORDER BY s.geom <-> ${point}
      LIMIT 1
    `)
    return result.rows[0] ?? null
  }

  private async getTodayContext(): Promise<{ today: string; nowTime: string }> {
    const result = await db.execute<{ today: string; now_time: string }>(sql`
      SELECT
        (CASE EXTRACT(ISODOW FROM CURRENT_DATE)
          WHEN 1 THEN 'seg' WHEN 2 THEN 'ter' WHEN 3 THEN 'qua'
          WHEN 4 THEN 'qui' WHEN 5 THEN 'sex' WHEN 6 THEN 'sab'
          WHEN 7 THEN 'dom'
        END) AS today,
        LOCALTIME::text AS now_time
    `)
    const row = result.rows[0]
    return { today: row.today, nowTime: row.now_time }
  }

  private async findScheduleForStreet(streetId: number, today: string): Promise<ScheduleCandidate | null> {
    const result = await db.execute<{
      route_id: string
      vehicle_id: string
      start_time: string
      days_of_week: string[]
      plate: string | null
      model: string | null
      color: string | null
      type: string
    }>(sql`
      SELECT cr.id AS route_id, cr.vehicle_id, cr.start_time, cr.days_of_week,
             v.plate, v.model, v.color, v.type
      FROM route_streets rs
      JOIN collection_routes cr ON cr.id = rs.route_id
      JOIN vehicles v ON v.id = cr.vehicle_id
      WHERE rs.street_id = ${streetId}
        AND cr.days_of_week IS NOT NULL
        AND cr.start_time IS NOT NULL
    `)

    const todayIndex = WEEKDAY_ORDER.indexOf(today)
    let best: ScheduleCandidate | null = null

    for (const row of result.rows) {
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

function parsePosition(position: { location: string; recordedAt: Date }) {
  const point = parseWktPoint(position.location)
  if (!point) return null
  return { lat: point.lat, lng: point.lng, recordedAt: position.recordedAt }
}
