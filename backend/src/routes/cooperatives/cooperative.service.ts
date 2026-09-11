import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "../../db"
import { cooperatives, type NewCooperative } from "../../db/schema"

export class CooperativeService {
  async findAll() {
    return db.select().from(cooperatives)
  }

  // Active cooperatives with a pin location set — backs the public/citizen
  // map POIs (see public-tracking.service.ts's listActiveCooperatives).
  async findActiveWithCoordinates() {
    return db
      .select()
      .from(cooperatives)
      .where(and(eq(cooperatives.active, true), isNotNull(cooperatives.lat), isNotNull(cooperatives.lng)))
  }

  async findById(id: string) {
    const [coop] = await db.select().from(cooperatives).where(eq(cooperatives.id, id)).limit(1)
    return coop ?? null
  }

  async findByName(name: string) {
    const [coop] = await db.select().from(cooperatives).where(eq(cooperatives.name, name)).limit(1)
    return coop ?? null
  }

  async create(data: NewCooperative) {
    const [coop] = await db.insert(cooperatives).values(data).returning()
    return coop
  }

  async update(id: string, data: Partial<NewCooperative>) {
    const [coop] = await db
      .update(cooperatives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cooperatives.id, id))
      .returning()
    return coop ?? null
  }

  async delete(id: string) {
    const [coop] = await db.delete(cooperatives).where(eq(cooperatives.id, id)).returning()
    return coop ?? null
  }
}
