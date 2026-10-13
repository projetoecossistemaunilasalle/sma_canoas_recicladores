import { eq, and, asc, sql, inArray } from "drizzle-orm"
import { db } from "../../db"
import { collectionRoutes, routeStreets, streets, type CollectionRoute } from "../../db/schema"
import { getTodayContext } from "../../lib/schedule"
import { lineLatLngs } from "../../lib/geometry"
import { VehicleService } from "../vehicles/vehicle.service"
import { StreetService } from "../streets/street.service"
import type { RouteInput } from "./route.schema"

const vehicleService = new VehicleService()
const streetService = new StreetService()

// Bounds how long after `startTime` a recurring route still counts as
// "running now" — shifts have no explicit end time in the schema, so this
// approximates one per shift. Without it, a route would read as "running"
// for the rest of the day (even overnight) once its start time passed.
const SHIFT_END_TIME: Record<string, string> = {
  manha: "12:00:00",
  tarde: "18:00:00",
  noite: "23:59:59",
}

interface PlannedSegment {
  streetId: number
  direction: "forward" | "reverse"
  distanceKm: number
  durationSeconds: number
  isStop: boolean
}

interface LegRow {
  [key: string]: unknown
  start_vid: string
  end_vid: string
  street_id: number
  direction: string
  distance_km: number | null
  duration_seconds: number | null
}

/** A stop sequence pgRouting can't plan — the client's input, so a 400. */
export class RoutePlanError extends Error {}

const legKey = (fromNode: number, toNode: number) => `${fromNode}>${toNode}`

function ownedBy(id: string, cooperativeId: string) {
  return and(eq(collectionRoutes.id, id), eq(collectionRoutes.cooperativeId, cooperativeId))
}

export class RouteService {
  async findAll(cooperativeId: string) {
    const rows = await db
      .select()
      .from(collectionRoutes)
      .where(eq(collectionRoutes.cooperativeId, cooperativeId))
      .orderBy(collectionRoutes.createdAt)
    return this.withRunningStatus(rows)
  }

  async findById(id: string, cooperativeId: string) {
    const [r] = await db
      .select()
      .from(collectionRoutes)
      .where(ownedBy(id, cooperativeId))
      .limit(1)
    if (!r) return null
    const [decorated] = await this.withRunningStatus([r])
    return decorated
  }

  // Adds `isRunningNow`: true only while TODAY is one of the route's
  // recurring days AND the current time falls inside its shift's window,
  // starting at `startTime` — see SHIFT_END_TIME above.
  private async withRunningStatus(rows: CollectionRoute[]) {
    if (rows.length === 0) return []
    const { today, nowTime } = await getTodayContext()
    return rows.map((r) => ({
      ...r,
      isRunningNow: Boolean(
        r.daysOfWeek?.includes(today) &&
          r.startTime &&
          r.startTime <= nowTime &&
          nowTime <= (SHIFT_END_TIME[r.shift ?? ""] ?? "23:59:59")
      ),
    }))
  }

  /**
   * Creates (no `id`) or replaces a route — schedule, vehicle and stops — in
   * one go. The path is computed before anything is written, and the route
   * row and its streets are saved in the same transaction, so a failed plan
   * never leaves a route without streets behind. Throws RoutePlanError when
   * the stops can't be connected.
   */
  async save(id: string | undefined, { stops, ...schedule }: RouteInput, cooperativeId: string) {
    if (id && !(await this.findById(id, cooperativeId))) return { error: "not_found" as const }
    // Its own vehicles or ones lent to it.
    if (!(await vehicleService.findVisible(schedule.vehicleId, cooperativeId))) {
      return { error: "vehicle_not_found" as const }
    }

    const segments = await this.computePath(stops.map((s) => s.streetId))

    // computePath emits exactly one isStop segment per stop, in stop order —
    // so the n-th stop segment gets the n-th stop's side/stretch. Connectors
    // keep the column defaults (both sides, whole segment); they're driven,
    // not collected, and every "who is served" query filters on is_stop.
    let stopIndex = 0
    const streetRows = segments.map((seg, idx) => {
      const stop = seg.isStop ? stops[stopIndex++] : undefined
      return {
        streetId: seg.streetId,
        stopOrder: idx + 1,
        direction: seg.direction,
        isStop: seg.isStop,
        ...(stop ? { side: stop.side, startFraction: stop.startFraction, endFraction: stop.endFraction } : {}),
      }
    })
    const values = {
      ...schedule,
      totalDistanceKm: segments.reduce((sum, s) => sum + s.distanceKm, 0),
      totalDurationSeconds: segments.reduce((sum, s) => sum + s.durationSeconds, 0),
    }

    const routeId = await db.transaction(async (tx) => {
      let routeId = id
      if (routeId) {
        await tx.update(collectionRoutes).set(values).where(eq(collectionRoutes.id, routeId))
        await tx.delete(routeStreets).where(eq(routeStreets.routeId, routeId))
      } else {
        const [created] = await tx
          .insert(collectionRoutes)
          .values({ ...values, cooperativeId })
          .returning({ id: collectionRoutes.id })
        routeId = created.id
      }
      await tx.insert(routeStreets).values(streetRows.map((r) => ({ ...r, routeId: routeId! })))
      return routeId
    })

    return { route: (await this.findById(routeId, cooperativeId))! }
  }

  async delete(id: string, cooperativeId: string) {
    const [r] = await db
      .delete(collectionRoutes)
      .where(ownedBy(id, cooperativeId))
      .returning({ id: collectionRoutes.id })
    return r ?? null
  }

  /** Only the streets the cooperative actually picked (is_stop = true) — used to prefill the edit UI. */
  async findStopStreets(routeId: string) {
    return db
      .select({
        streetId: routeStreets.streetId,
        stopOrder: routeStreets.stopOrder,
        name: streets.name,
        line: lineLatLngs(streets.geom).as("line"),
        side: routeStreets.side,
        startFraction: routeStreets.startFraction,
        endFraction: routeStreets.endFraction,
      })
      .from(routeStreets)
      .innerJoin(streets, eq(streets.id, routeStreets.streetId))
      .where(and(eq(routeStreets.routeId, routeId), eq(routeStreets.isStop, true)))
      .orderBy(asc(routeStreets.stopOrder))
  }

  /** The full driven path for a stop sequence, without saving — the route builder's live preview. */
  async preview(stopStreetIds: number[]) {
    const segments = await this.computePath(stopStreetIds)
    const rows = await streetService.findByIds([...new Set(segments.map((s) => s.streetId))])
    const byId = new Map(rows.map((r) => [r.id, r]))
    return segments.map((seg) => ({
      streetId: seg.streetId,
      isStop: seg.isStop,
      name: byId.get(seg.streetId)?.name ?? null,
      line: byId.get(seg.streetId)?.line ?? [],
    }))
  }

  /**
   * Takes an ordered list of "stop" street ids the cooperative wants
   * collected and fills in, with pgRouting, the streets actually driven
   * between each pair of stops. Every stop is driven in its own geometry
   * direction (source→target), so each leg runs from one stop's target to
   * the next one's source. Pure computation, no writes.
   */
  private async computePath(stopStreetIds: number[]): Promise<PlannedSegment[]> {
    const stopStreets = await db
      .select({
        id: streets.id,
        name: streets.name,
        source: streets.source,
        target: streets.target,
        lengthKm: streets.lengthKm,
        cost: streets.cost,
      })
      .from(streets)
      .where(inArray(streets.id, stopStreetIds))

    const byId = new Map(stopStreets.map((s) => [s.id, s]))
    const stops = stopStreetIds.map((id) => {
      const stop = byId.get(id)
      if (!stop) throw new RoutePlanError(`Rua ${id} não encontrada.`)
      if (stop.source === null || stop.target === null) {
        throw new RoutePlanError(`A rua ${stop.name ?? id} não tem topologia de roteamento (rode streets:import).`)
      }
      return { ...stop, source: stop.source, target: stop.target }
    })

    const legs = await this.findLegs(
      stops.slice(1).map((to, i) => [stops[i].target, to.source] as [number, number]).filter(([from, to]) => from !== to)
    )

    const stopSegment = (s: (typeof stops)[number]): PlannedSegment => ({
      streetId: s.id,
      direction: "forward",
      distanceKm: s.lengthKm ?? 0,
      durationSeconds: s.cost ?? 0,
      isStop: true,
    })

    const segments = [stopSegment(stops[0])]
    for (let i = 1; i < stops.length; i++) {
      const from = stops[i - 1]
      const to = stops[i]
      if (from.target !== to.source) {
        const leg = legs.get(legKey(from.target, to.source))
        if (!leg) {
          throw new RoutePlanError(
            `Não há caminho pelas ruas entre ${from.name ?? `a rua ${from.id}`} e ${to.name ?? `a rua ${to.id}`} — a malha pode estar desconectada aí.`
          )
        }
        segments.push(...leg)
      }
      segments.push(stopSegment(to))
    }
    return segments
  }

  // Every leg in ONE pgr_dijkstra call (its "combinations" form) — one load
  // of the street graph instead of one per pair of stops.
  private async findLegs(pairs: [number, number][]): Promise<Map<string, PlannedSegment[]>> {
    const legs = new Map<string, PlannedSegment[]>()
    const unique = [...new Map(pairs.map((p) => [legKey(...p), p])).values()]
    if (unique.length === 0) return legs
    if (!unique.flat().every(Number.isInteger)) throw new Error("Street node ids must be integers")

    // pgRouting takes the combinations as SQL text; node ids are integers
    // straight from the DB (checked above), safe to inline.
    const combinations = `SELECT * FROM (VALUES ${unique.map(([s, t]) => `(${s}, ${t})`).join(", ")}) AS c(source, target)`

    // pgr_dijkstra's row semantics are node[i] --edge[i]--> node[i+1] —
    // edge[i] starts at THIS row's own node, not the previous row's (a
    // LAG(node) here would get every edge's direction backwards).
    const result = await db.execute<LegRow>(sql`
      SELECT p.start_vid, p.end_vid, p.edge::integer AS street_id,
             CASE WHEN s.source = p.node THEN 'forward' ELSE 'reverse' END AS direction,
             s.length_km AS distance_km, p.cost AS duration_seconds
      FROM pgr_dijkstra('SELECT id, source, target, cost, reverse_cost FROM streets', ${combinations}, directed := true) p
      JOIN streets s ON s.id = p.edge
      WHERE p.edge <> -1
      ORDER BY p.start_vid, p.end_vid, p.path_seq
    `)

    for (const row of result.rows) {
      const key = legKey(Number(row.start_vid), Number(row.end_vid))
      const leg = legs.get(key) ?? []
      leg.push({
        streetId: row.street_id,
        direction: row.direction === "forward" ? "forward" : "reverse",
        distanceKm: Number(row.distance_km ?? 0),
        durationSeconds: Number(row.duration_seconds ?? 0),
        isStop: false,
      })
      legs.set(key, leg)
    }
    return legs
  }
}
