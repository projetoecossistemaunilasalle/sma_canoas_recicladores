import { eq, and, asc } from "drizzle-orm"
import { db } from "../../db"
import { collectionRoutes, routeStreets, type NewCollectionRoute, type NewRouteStreet } from "../../db/schema"

export class RouteService {
  // ==================== COLLECTION ROUTES ====================
  async findAll(filterCooperativeId?: string) {
    if (filterCooperativeId) {
      return db.select().from(collectionRoutes).where(eq(collectionRoutes.cooperativeId, filterCooperativeId))
    }
    return db.select().from(collectionRoutes)
  }

  async findById(id: string, filterCooperativeId?: string) {
    let query = db.select().from(collectionRoutes).where(eq(collectionRoutes.id, id)).limit(1)
    if (filterCooperativeId) {
      query = db.select().from(collectionRoutes).where(and(eq(collectionRoutes.id, id), eq(collectionRoutes.cooperativeId, filterCooperativeId))).limit(1)
    }
    const [r] = await query
    return r ?? null
  }

  async create(data: NewCollectionRoute) {
    const [r] = await db.insert(collectionRoutes).values(data).returning()
    return r
  }

  async update(id: string, data: Partial<NewCollectionRoute>, filterCooperativeId?: string) {
    const payload = { ...data, updatedAt: new Date() }
    let query
    if (filterCooperativeId) {
      query = db.update(collectionRoutes).set(payload).where(and(eq(collectionRoutes.id, id), eq(collectionRoutes.cooperativeId, filterCooperativeId))).returning()
    } else {
      query = db.update(collectionRoutes).set(payload).where(eq(collectionRoutes.id, id)).returning()
    }
    const [r] = await query
    return r ?? null
  }

  async delete(id: string, filterCooperativeId?: string) {
    let query
    if (filterCooperativeId) {
      query = db.delete(collectionRoutes).where(and(eq(collectionRoutes.id, id), eq(collectionRoutes.cooperativeId, filterCooperativeId))).returning()
    } else {
      query = db.delete(collectionRoutes).where(eq(collectionRoutes.id, id)).returning()
    }
    const [r] = await query
    return r ?? null
  }

  // ==================== ROUTE STREETS ====================
  async findStreetsByRoute(routeId: string) {
    return db.select().from(routeStreets).where(eq(routeStreets.routeId, routeId)).orderBy(asc(routeStreets.stopOrder))
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
}
