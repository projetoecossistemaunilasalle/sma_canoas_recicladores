import { eq, and, desc } from "drizzle-orm"
import { db } from "../../db"
import { vehicles, vehiclePositions, type NewVehicle, type NewVehiclePosition } from "../../db/schema"

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
    return db.select().from(vehiclePositions).where(eq(vehiclePositions.vehicleId, vehicleId)).orderBy(desc(vehiclePositions.recordedAt)).limit(limit)
  }

  async findLatestPosition(vehicleId: string) {
    const [pos] = await db
      .select()
      .from(vehiclePositions)
      .where(eq(vehiclePositions.vehicleId, vehicleId))
      .orderBy(desc(vehiclePositions.recordedAt))
      .limit(1)
    return pos ?? null
  }

  async createPosition(vehicleId: string, data: NewVehiclePosition) {
    const [pos] = await db.insert(vehiclePositions).values({ ...data, vehicleId }).returning()
    return pos
  }
}
