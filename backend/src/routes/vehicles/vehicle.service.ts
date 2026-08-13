import { eq, and, desc, sql } from "drizzle-orm"
import { db } from "../../db"
import { vehicles, vehiclePositions, type NewVehicle, type NewVehiclePosition } from "../../db/schema"

const positionColumns = {
  id: vehiclePositions.id,
  vehicleId: vehiclePositions.vehicleId,
  location: sql<string>`ST_AsText(${vehiclePositions.location})`.as("location"),
  recordedAt: vehiclePositions.recordedAt,
}

export class VehicleService {
  async findAll(filterCooperativeId?: string) {
    if (filterCooperativeId) {
      return db.select().from(vehicles).where(eq(vehicles.cooperativeId, filterCooperativeId))
    }
    return db.select().from(vehicles)
  }

  async findById(id: string, filterCooperativeId?: string) {
    let query = db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1)
    if (filterCooperativeId) {
      query = db.select().from(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.cooperativeId, filterCooperativeId))).limit(1)
    }
    const [v] = await query
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
    let query
    if (filterCooperativeId) {
      query = db.update(vehicles).set(payload).where(and(eq(vehicles.id, id), eq(vehicles.cooperativeId, filterCooperativeId))).returning()
    } else {
      query = db.update(vehicles).set(payload).where(eq(vehicles.id, id)).returning()
    }
    const [v] = await query
    return v ?? null
  }

  async delete(id: string, filterCooperativeId?: string) {
    let query
    if (filterCooperativeId) {
      query = db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.cooperativeId, filterCooperativeId))).returning()
    } else {
      query = db.delete(vehicles).where(eq(vehicles.id, id)).returning()
    }
    const [v] = await query
    return v ?? null
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
  async getEta(vehicleId: string, lat: number, lng: number) {
    const result = await db.execute<{
      status: string
      tempo_segundos: number
      tempo_texto: string
      distancia_km: number
      ruas_restantes: number
      rua_atual: string | null
      rua_cidadao: string | null
    }>(sql`SELECT * FROM get_eta_following_route(${vehicleId}, ${lat}, ${lng})`)
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
    }
  }
}
