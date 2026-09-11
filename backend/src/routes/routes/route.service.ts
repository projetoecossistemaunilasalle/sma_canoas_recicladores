import { eq, and, asc, sql, inArray } from "drizzle-orm"
import { db } from "../../db"
import { collectionRoutes, routeStreets, streets, type NewCollectionRoute, type NewRouteStreet, type CollectionRoute } from "../../db/schema"
import { scopeCondition } from "../../lib/db-scope"
import { getTodayContext } from "../../lib/schedule"

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

interface DijkstraLegRow {
  [key: string]: unknown
  street_id: number
  direction: string
  distance_km: number | null
  duration_seconds: number | null
}

export class RouteService {
  // ==================== COLLECTION ROUTES ====================
  async findAll(filterCooperativeId?: string) {
    const rows = await db.select().from(collectionRoutes).where(scopeCondition(undefined, collectionRoutes.cooperativeId, filterCooperativeId))
    return this.withRunningStatus(rows)
  }

  async findById(id: string, filterCooperativeId?: string) {
    const [r] = await db
      .select()
      .from(collectionRoutes)
      .where(scopeCondition(eq(collectionRoutes.id, id), collectionRoutes.cooperativeId, filterCooperativeId))
      .limit(1)
    if (!r) return null
    const [decorated] = await this.withRunningStatus([r])
    return decorated
  }

  // Adds `isRunningNow`: true only while TODAY is one of the route's
  // recurring days AND the current time falls inside its shift's window,
  // starting at `startTime` — see SHIFT_END_TIME above. `status` itself
  // (currently always "active" once a route is created — there's no
  // start/stop action in this app yet) can't tell "scheduled" apart from
  // "actually happening right now", so the dashboard's "Rotas em Andamento"
  // count needs this instead of a raw status filter.
  private async withRunningStatus<T extends Pick<CollectionRoute, "status" | "daysOfWeek" | "startTime" | "shift">>(
    rows: T[]
  ): Promise<(T & { isRunningNow: boolean })[]> {
    if (rows.length === 0) return []
    const { today, nowTime } = await getTodayContext()
    return rows.map((r) => ({
      ...r,
      isRunningNow: Boolean(
        r.status === "active" &&
          r.daysOfWeek?.includes(today) &&
          r.startTime &&
          r.startTime <= nowTime &&
          nowTime <= (SHIFT_END_TIME[r.shift ?? ""] ?? "23:59:59")
      ),
    }))
  }

  async create(data: NewCollectionRoute) {
    const [r] = await db.insert(collectionRoutes).values(data).returning()
    const [decorated] = await this.withRunningStatus([r])
    return decorated
  }

  async update(id: string, data: Partial<NewCollectionRoute>, filterCooperativeId?: string) {
    const payload = { ...data, updatedAt: new Date() }
    const [r] = await db
      .update(collectionRoutes)
      .set(payload)
      .where(scopeCondition(eq(collectionRoutes.id, id), collectionRoutes.cooperativeId, filterCooperativeId))
      .returning()
    if (!r) return null
    const [decorated] = await this.withRunningStatus([r])
    return decorated
  }

  async delete(id: string, filterCooperativeId?: string) {
    const [r] = await db
      .delete(collectionRoutes)
      .where(scopeCondition(eq(collectionRoutes.id, id), collectionRoutes.cooperativeId, filterCooperativeId))
      .returning()
    return r ?? null
  }

  // ==================== ROUTE STREETS ====================
  async findStreetsByRoute(routeId: string) {
    return db.select().from(routeStreets).where(eq(routeStreets.routeId, routeId)).orderBy(asc(routeStreets.stopOrder))
  }

  /** Only the streets the cooperative actually picked (is_stop = true), with geometry — used to prefill the edit UI. */
  async findStopStreets(routeId: string) {
    return db
      .select({
        streetId: routeStreets.streetId,
        stopOrder: routeStreets.stopOrder,
        name: streets.name,
        geom: sql<string>`ST_AsText(${streets.geom})`.as("geom"),
      })
      .from(routeStreets)
      .innerJoin(streets, eq(streets.id, routeStreets.streetId))
      .where(and(eq(routeStreets.routeId, routeId), eq(routeStreets.isStop, true)))
      .orderBy(asc(routeStreets.stopOrder))
  }

  async findRouteStreetById(id: string) {
    const [rs] = await db.select().from(routeStreets).where(eq(routeStreets.id, id)).limit(1)
    return rs ?? null
  }

  async addStreetToRoute(data: NewRouteStreet) {
    const [rs] = await db.insert(routeStreets).values(data).returning()
    return rs
  }

  async updateRouteStreet(id: string, data: Partial<NewRouteStreet>) {
    const [rs] = await db.update(routeStreets).set(data).where(eq(routeStreets.id, id)).returning()
    return rs ?? null
  }

  async removeRouteStreet(id: string) {
    const [rs] = await db.delete(routeStreets).where(eq(routeStreets.id, id)).returning()
    return rs ?? null
  }

  // ==================== ROUTE PLANNING ====================
  /**
   * Takes an ordered list of "stop" street ids the cooperative wants
   * collected and uses pgr_dijkstra to fill in the actual streets driven
   * between each pair of stops. Pure computation, no writes — used both by
   * planRoute() (which persists the result) and the /routes/preview
   * endpoint (which just shows it on the map while the user is drawing).
   */
  async computePath(stopStreetIds: number[]): Promise<PlannedSegment[]> {
    if (stopStreetIds.length === 0) {
      throw new Error("stopStreetIds must not be empty")
    }

    const stopStreets = await db
      .select({
        id: streets.id,
        source: streets.source,
        target: streets.target,
        lengthKm: streets.lengthKm,
        cost: streets.cost,
      })
      .from(streets)
      .where(inArray(streets.id, stopStreetIds))

    const stopMap = new Map(stopStreets.map((s) => [s.id, s]))
    for (const id of stopStreetIds) {
      const stop = stopMap.get(id)
      if (!stop) throw new Error(`Street ${id} not found`)
      if (stop.source === null || stop.target === null) {
        throw new Error(`Street ${id} has no routing topology (re-run streets:import)`)
      }
    }

    const segments: PlannedSegment[] = []
    const firstStop = stopMap.get(stopStreetIds[0])!
    segments.push({
      streetId: firstStop.id,
      direction: "forward",
      distanceKm: firstStop.lengthKm ?? 0,
      durationSeconds: firstStop.cost ?? 0,
      isStop: true,
    })

    for (let i = 0; i < stopStreetIds.length - 1; i++) {
      const from = stopMap.get(stopStreetIds[i])!
      const to = stopMap.get(stopStreetIds[i + 1])!

      if (from.target !== to.source) {
        // pgr_dijkstra's row semantics are node[i] --edge[i]--> node[i+1] —
        // edge[i] starts at THIS row's own node, not the previous row's
        // (a LAG(node) here would be off by one and get every edge's
        // direction backwards, first one included).
        const legResult = await db.execute<DijkstraLegRow>(sql`
          SELECT
            p.edge::integer AS street_id,
            CASE WHEN s.source = p.node THEN 'forward' ELSE 'reverse' END AS direction,
            s.length_km AS distance_km,
            p.cost AS duration_seconds
          FROM pgr_dijkstra(
            'SELECT id, source, target, cost, reverse_cost FROM streets',
            ${from.target}::bigint, ${to.source}::bigint, directed := true
          ) p
          JOIN streets s ON s.id = p.edge
          WHERE p.edge <> -1
          ORDER BY p.seq
        `)
        if (legResult.rows.length === 0) {
          throw new Error(
            `No connected path found between street ${from.id} and street ${to.id} — the streets network may be disconnected there`
          )
        }
        for (const row of legResult.rows) {
          segments.push({
            streetId: row.street_id,
            direction: row.direction === "forward" ? "forward" : "reverse",
            distanceKm: Number(row.distance_km ?? 0),
            durationSeconds: Number(row.duration_seconds ?? 0),
            isStop: false,
          })
        }
      }

      segments.push({
        streetId: to.id,
        direction: "forward",
        distanceKm: to.lengthKm ?? 0,
        durationSeconds: to.cost ?? 0,
        isStop: true,
      })
    }

    return segments
  }

  async planRoute(routeId: string, stopStreetIds: number[]) {
    const segments = await this.computePath(stopStreetIds)

    await db.transaction(async (tx) => {
      await tx.delete(routeStreets).where(eq(routeStreets.routeId, routeId))
      await tx.insert(routeStreets).values(
        segments.map((seg, idx) => ({
          routeId,
          streetId: seg.streetId,
          stopOrder: idx + 1,
          direction: seg.direction,
          distanceFromPreviousKm: seg.distanceKm,
          durationFromPreviousSeconds: seg.durationSeconds,
          isStop: seg.isStop,
        }))
      )

      const totalDistanceKm = segments.reduce((sum, s) => sum + s.distanceKm, 0)
      const totalDurationSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0)
      const payload = { totalDistanceKm, totalDurationSeconds, updatedAt: new Date() }
      await tx.update(collectionRoutes).set(payload).where(eq(collectionRoutes.id, routeId))
    })

    return this.findStreetsByRoute(routeId)
  }
}
