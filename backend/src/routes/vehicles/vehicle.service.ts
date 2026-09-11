import { eq, and, or, inArray, desc, sql } from "drizzle-orm"
import { db } from "../../db"
import { vehicles, vehiclePositions, collectionRoutes, type NewVehicle, type NewVehiclePosition } from "../../db/schema"
import { scopeCondition } from "../../lib/db-scope"
import { WEEKDAY_ORDER, WEEKDAY_LABELS } from "../../lib/weekdays"

const positionColumns = {
  id: vehiclePositions.id,
  vehicleId: vehiclePositions.vehicleId,
  location: sql<string>`ST_AsText(${vehiclePositions.location})`.as("location"),
  recordedAt: vehiclePositions.recordedAt,
}

export interface EtaStop {
  streetId: number
  name: string | null
  lat: number
  lng: number
}

export interface ConflictingRoute {
  id: string
  label: string
}

export interface LoanResult {
  vehicle?: typeof vehicles.$inferSelect
  error?: "not_found" | "same_cooperative" | "already_loaned" | "not_loaned" | "route_conflict"
  routes?: ConflictingRoute[]
}

const SHIFT_LABELS: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" }

function describeRoute(r: { daysOfWeek: string[] | null; shift: string | null; scheduledDate: string | null }): string {
  if (r.daysOfWeek && r.daysOfWeek.length > 0) {
    // Stored in whatever order the cooperative clicked them in — sort to the
    // canonical week order so the confirmation dialog reads naturally.
    const days = [...r.daysOfWeek]
      .sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
      .map((d) => WEEKDAY_LABELS[d] ?? d)
      .join(", ")
    const shift = r.shift ? ` · ${SHIFT_LABELS[r.shift] ?? r.shift}` : ""
    return `${days}${shift}`
  }
  if (r.scheduledDate) return `Rota agendada para ${r.scheduledDate}`
  return "Rota sem agendamento definido"
}

// get_eta_following_route() returns the path as GeoJSON text (coordinates
// are [lng, lat], PostGIS's default order) — flip to {lat,lng} to match the
// rest of the app's convention (see parseWktPoint in lib/geo.ts).
function parsePathGeoJson(geojson: string | null): Array<{ lat: number; lng: number }> {
  if (!geojson) return []
  const parsed = JSON.parse(geojson) as { type: string; coordinates: [number, number][] }
  return parsed.coordinates.map(([lng, lat]) => ({ lat, lng }))
}

export class VehicleService {
  // Visible to a cooperative if it owns the vehicle OR currently holds it on
  // loan — a borrowed vehicle needs to show up in the borrower's fleet list
  // and be assignable to their routes, even though cooperativeId still
  // points at the lender.
  async findAll(filterCooperativeId?: string) {
    if (filterCooperativeId) {
      return db
        .select()
        .from(vehicles)
        .where(or(eq(vehicles.cooperativeId, filterCooperativeId), eq(vehicles.loanedToCooperativeId, filterCooperativeId)))
    }
    return db.select().from(vehicles)
  }

  async findById(id: string, filterCooperativeId?: string) {
    const [v] = await db
      .select()
      .from(vehicles)
      .where(scopeCondition(eq(vehicles.id, id), vehicles.cooperativeId, filterCooperativeId))
      .limit(1)
    return v ?? null
  }

  async findByPlate(plate: string) {
    const [v] = await db.select().from(vehicles).where(eq(vehicles.plate, plate)).limit(1)
    return v ?? null
  }

  async create(data: NewVehicle) {
    const [v] = await db.insert(vehicles).values(data).returning()
    return v
  }

  async update(id: string, data: Partial<NewVehicle>, filterCooperativeId?: string) {
    const payload = { ...data, updatedAt: new Date() }
    const [v] = await db
      .update(vehicles)
      .set(payload)
      .where(scopeCondition(eq(vehicles.id, id), vehicles.cooperativeId, filterCooperativeId))
      .returning()
    return v ?? null
  }

  async delete(id: string, filterCooperativeId?: string) {
    const [v] = await db
      .delete(vehicles)
      .where(scopeCondition(eq(vehicles.id, id), vehicles.cooperativeId, filterCooperativeId))
      .returning()
    return v ?? null
  }

  // Loans
  // Any planned/active route still pointing at this vehicle — whichever
  // cooperative created it — needs to be flagged before a loan starts or
  // ends, since the truck won't physically be there to run it.
  async findConflictingRoutes(vehicleId: string): Promise<ConflictingRoute[]> {
    const rows = await db
      .select({
        id: collectionRoutes.id,
        daysOfWeek: collectionRoutes.daysOfWeek,
        shift: collectionRoutes.shift,
        scheduledDate: collectionRoutes.scheduledDate,
      })
      .from(collectionRoutes)
      .where(and(eq(collectionRoutes.vehicleId, vehicleId), inArray(collectionRoutes.status, ["planned", "active"])))
    return rows.map((r) => ({ id: r.id, label: describeRoute(r) }))
  }

  async loanTo(id: string, targetCooperativeId: string, confirmUnlink: boolean, filterCooperativeId?: string): Promise<LoanResult> {
    const vehicle = await this.findById(id, filterCooperativeId)
    if (!vehicle) return { error: "not_found" }
    if (vehicle.cooperativeId === targetCooperativeId) return { error: "same_cooperative" }
    if (vehicle.loanedToCooperativeId) return { error: "already_loaned" }

    const routes = await this.findConflictingRoutes(id)
    if (routes.length > 0 && !confirmUnlink) return { error: "route_conflict", routes }

    const v = await db.transaction(async (tx) => {
      if (routes.length > 0) {
        await tx.update(collectionRoutes).set({ vehicleId: null }).where(eq(collectionRoutes.vehicleId, id))
      }
      const [updated] = await tx
        .update(vehicles)
        .set({ loanedToCooperativeId: targetCooperativeId, updatedAt: new Date() })
        .where(eq(vehicles.id, id))
        .returning()
      return updated
    })
    return { vehicle: v }
  }

  async returnLoan(id: string, confirmUnlink: boolean, filterCooperativeId?: string): Promise<LoanResult> {
    const vehicle = await this.findById(id, filterCooperativeId)
    if (!vehicle) return { error: "not_found" }
    if (!vehicle.loanedToCooperativeId) return { error: "not_loaned" }

    const routes = await this.findConflictingRoutes(id)
    if (routes.length > 0 && !confirmUnlink) return { error: "route_conflict", routes }

    const v = await db.transaction(async (tx) => {
      if (routes.length > 0) {
        await tx.update(collectionRoutes).set({ vehicleId: null }).where(eq(collectionRoutes.vehicleId, id))
      }
      const [updated] = await tx
        .update(vehicles)
        .set({ loanedToCooperativeId: null, updatedAt: new Date() })
        .where(eq(vehicles.id, id))
        .returning()
      return updated
    })
    return { vehicle: v }
  }

  // Positions
  async findPositions(vehicleId: string, limit = 50) {
    return db.select(positionColumns).from(vehiclePositions).where(eq(vehiclePositions.vehicleId, vehicleId)).orderBy(desc(vehiclePositions.recordedAt)).limit(limit)
  }

  async findLatestPosition(vehicleId: string) {
    const [pos] = await db
      .select(positionColumns)
      .from(vehiclePositions)
      .where(eq(vehiclePositions.vehicleId, vehicleId))
      .orderBy(desc(vehiclePositions.recordedAt))
      .limit(1)
    return pos ?? null
  }

  async createPosition(vehicleId: string, data: NewVehiclePosition) {
    const [pos] = await db.insert(vehiclePositions).values({ ...data, vehicleId }).returning(positionColumns)
    return pos
  }

  // Tracking: "is this vehicle's route near me, and when will it arrive?"
  // Delegates to get_eta_following_route() (docker/postgres/initdb/005-maps.sql),
  // which walks the vehicle's active route_streets sequence rather than
  // re-running pgRouting on every request.
  async getEta(vehicleId: string, lat: number, lng: number, citizenStreetId?: number) {
    const result = await db.execute<{
      status: string
      tempo_segundos: number
      tempo_texto: string
      distancia_km: number
      ruas_restantes: number
      rua_atual: string | null
      rua_cidadao: string | null
      path_geojson: string | null
      stops_json: string | null
    }>(sql`SELECT * FROM get_eta_following_route(${vehicleId}, ${lat}, ${lng}, ${citizenStreetId ?? null})`)
    const row = result.rows[0]
    if (!row) return null
    return {
      status: row.status,
      etaSeconds: Number(row.tempo_segundos),
      etaText: row.tempo_texto,
      distanceKm: Number(row.distancia_km),
      streetsRemaining: row.ruas_restantes,
      currentStreet: row.rua_atual,
      citizenStreet: row.rua_cidadao,
      path: parsePathGeoJson(row.path_geojson),
      stops: row.stops_json ? (JSON.parse(row.stops_json) as EtaStop[]) : [],
    }
  }
}
