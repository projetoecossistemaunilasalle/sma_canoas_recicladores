import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "../../db"
import { cooperatives, type NewCooperative } from "../../db/schema"

export class CooperativeService {
  async findActive() {
    return db.select().from(cooperatives).where(eq(cooperatives.active, true)).orderBy(cooperatives.name)
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

  async update(id: string, data: Partial<NewCooperative>) {
    const [coop] = await db
      .update(cooperatives)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cooperatives.id, id))
      .returning()
    return coop ?? null
  }
}
