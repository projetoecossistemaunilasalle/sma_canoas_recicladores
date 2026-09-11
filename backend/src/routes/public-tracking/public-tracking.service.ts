import { sql } from "drizzle-orm"
import { db } from "../../db"
import { parseWktPoint } from "../../lib/geo"
import { WEEKDAY_ORDER } from "../../lib/weekdays"
import { getTodayContext } from "../../lib/schedule"
import { VehicleService } from "../vehicles/vehicle.service"
import { CooperativeService } from "../cooperatives/cooperative.service"

const vehicleService = new VehicleService()
const cooperativeService = new CooperativeService()

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

  async checkAddress(lat: number, lng: number) {
    const nearestAny = await this.findNearestStreet(lat, lng)
    const servedStreet = nearestAny ? await this.resolveServedStreet(lat, lng, nearestAny) : null
    const street = servedStreet ?? nearestAny
    if (!street) return { status: "no_route" as const }

    if (!servedStreet) return { status: "no_route" as const, street: street.name }

    const { today, nowTime } = await getTodayContext()
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
