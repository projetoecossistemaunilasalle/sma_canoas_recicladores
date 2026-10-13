import { and, eq, or, desc, sql, getTableColumns } from "drizzle-orm"
import { db } from "../../db"
import { vehicles, vehiclePositions, collectionRoutes, type NewVehicle, type Vehicle } from "../../db/schema"
import { pointFromLatLng } from "../../lib/geometry"

const positionColumns = {
  lat: sql<number>`ST_Y(${vehiclePositions.location})`,
  lng: sql<number>`ST_X(${vehiclePositions.location})`,
  recordedAt: vehiclePositions.recordedAt,
}

export interface ConflictingRoute {
  id: string
  daysOfWeek: string[] | null
  shift: string | null
}

export interface LoanResult {
  vehicle?: Vehicle
  error?: "not_found" | "same_cooperative" | "already_loaned" | "not_loaned" | "route_conflict"
  routes?: ConflictingRoute[]
}

// A cooperative "sees" a vehicle it owns OR currently holds on loan — the
// borrower drives it, lists it and assigns it to routes, even though
// cooperativeId still points at the lender. Editing, deleting and lending it
// stay owner-only (ownedBy).
function visibleTo(cooperativeId: string) {
  return or(eq(vehicles.cooperativeId, cooperativeId), eq(vehicles.loanedToCooperativeId, cooperativeId))
}

function ownedBy(id: string, cooperativeId: string) {
  return and(eq(vehicles.id, id), eq(vehicles.cooperativeId, cooperativeId))
}

export class VehicleService {
  async findAll(cooperativeId: string) {
    const rows = await db
      .select({
        ...getTableColumns(vehicles),
        // Table-qualified on purpose: in a single-table select Drizzle renders
        // ${vehicles.id} as a bare "id", which here would mean vp.id.
        lastPosition: sql<{ lat: number; lng: number; recordedAt: string } | null>`(
          SELECT json_build_object('lat', ST_Y(vp.location), 'lng', ST_X(vp.location), 'recordedAt', vp.recorded_at)
          FROM ${vehiclePositions} vp
          WHERE vp.vehicle_id = ${vehicles}.id
          ORDER BY vp.recorded_at DESC
          LIMIT 1
        )`,
      })
      .from(vehicles)
      .where(visibleTo(cooperativeId))
      .orderBy(vehicles.plate)
    return rows.map((v) => ({
      ...v,
      lastPosition: v.lastPosition ? { ...v.lastPosition, recordedAt: new Date(v.lastPosition.recordedAt) } : null,
    }))
  }

  /** Owner-only — what edit/delete/lend go through. */
  async findById(id: string, cooperativeId: string) {
    const [v] = await db.select().from(vehicles).where(ownedBy(id, cooperativeId)).limit(1)
    return v ?? null
  }

  /** Owner or borrower — what assigning to a route and posting GPS go through. */
  async findVisible(id: string, cooperativeId: string) {
    const [v] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, id), visibleTo(cooperativeId)))
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

  async update(id: string, data: Partial<NewVehicle>, cooperativeId: string) {
    const [v] = await db
      .update(vehicles)
      .set({ ...data, updatedAt: new Date() })
      .where(ownedBy(id, cooperativeId))
      .returning()
    return v ?? null
  }

  async delete(id: string, cooperativeId: string) {
    const [v] = await db.delete(vehicles).where(ownedBy(id, cooperativeId)).returning()
    return v ?? null
  }

  // Loans. Lending (targetCooperativeId set) and returning (null) share the
  // same guard: any route — whichever cooperative made it — still pointing at
  // the vehicle would silently lose its truck, so the caller has to confirm
  // (confirmUnlink) and those routes' vehicleId is cleared in the same
  // transaction as the loan change.
  async setLoan(
    id: string,
    targetCooperativeId: string | null,
    confirmUnlink: boolean,
    cooperativeId: string
  ): Promise<LoanResult> {
    const vehicle = await this.findById(id, cooperativeId)
    if (!vehicle) return { error: "not_found" }
    if (targetCooperativeId) {
      if (vehicle.cooperativeId === targetCooperativeId) return { error: "same_cooperative" }
      if (vehicle.loanedToCooperativeId) return { error: "already_loaned" }
    } else if (!vehicle.loanedToCooperativeId) {
      return { error: "not_loaned" }
    }

    const routes = await db
      .select({ id: collectionRoutes.id, daysOfWeek: collectionRoutes.daysOfWeek, shift: collectionRoutes.shift })
      .from(collectionRoutes)
      .where(eq(collectionRoutes.vehicleId, id))
    if (routes.length > 0 && !confirmUnlink) return { error: "route_conflict", routes }

    const updated = await db.transaction(async (tx) => {
      if (routes.length > 0) {
        await tx.update(collectionRoutes).set({ vehicleId: null }).where(eq(collectionRoutes.vehicleId, id))
      }
      const [v] = await tx
        .update(vehicles)
        .set({ loanedToCooperativeId: targetCooperativeId, updatedAt: new Date() })
        .where(eq(vehicles.id, id))
        .returning()
      return v
    })
    return { vehicle: updated }
  }

  // Positions
  async findLatestPosition(vehicleId: string) {
    const [pos] = await db
      .select(positionColumns)
      .from(vehiclePositions)
      .where(eq(vehiclePositions.vehicleId, vehicleId))
      .orderBy(desc(vehiclePositions.recordedAt))
      .limit(1)
    return pos ?? null
  }

  async createPosition(vehicleId: string, lat: number, lng: number, recordedAt?: Date) {
    const [pos] = await db
      .insert(vehiclePositions)
      .values({ vehicleId, location: pointFromLatLng(lat, lng), ...(recordedAt ? { recordedAt } : {}) })
      .returning(positionColumns)
    return pos
  }
}
