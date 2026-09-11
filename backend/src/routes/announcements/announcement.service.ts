import { and, desc, eq } from "drizzle-orm"
import { db } from "../../db"
import { announcements, cooperatives, type NewAnnouncement } from "../../db/schema"

export interface AnnouncementFilter {
  type?: string
  cooperativeId?: string
}

const selection = {
  id: announcements.id,
  cooperativeId: announcements.cooperativeId,
  cooperativeName: cooperatives.name,
  type: announcements.type,
  title: announcements.title,
  body: announcements.body,
  mainImage: announcements.mainImage,
  subImage1: announcements.subImage1,
  subImage2: announcements.subImage2,
  createdAt: announcements.createdAt,
}

export class AnnouncementService {
  async findAll(filter: AnnouncementFilter = {}) {
    const conditions = [
      filter.type ? eq(announcements.type, filter.type) : undefined,
      filter.cooperativeId ? eq(announcements.cooperativeId, filter.cooperativeId) : undefined,
    ].filter((c) => c !== undefined)

    return db
      .select(selection)
      .from(announcements)
      .innerJoin(cooperatives, eq(cooperatives.id, announcements.cooperativeId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(announcements.createdAt))
  }

  async findById(id: string) {
    const [row] = await db
      .select(selection)
      .from(announcements)
      .innerJoin(cooperatives, eq(cooperatives.id, announcements.cooperativeId))
      .where(eq(announcements.id, id))
      .limit(1)
    return row ?? null
  }

  async create(data: NewAnnouncement) {
    const [row] = await db.insert(announcements).values(data).returning()
    const [coop] = await db.select({ name: cooperatives.name }).from(cooperatives).where(eq(cooperatives.id, row.cooperativeId)).limit(1)
    return { ...row, cooperativeName: coop?.name ?? "" }
  }

  async update(id: string, data: Partial<NewAnnouncement>) {
    const [row] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning()
    if (!row) return null
    const [coop] = await db.select({ name: cooperatives.name }).from(cooperatives).where(eq(cooperatives.id, row.cooperativeId)).limit(1)
    return { ...row, cooperativeName: coop?.name ?? "" }
  }

  async delete(id: string) {
    const [row] = await db.delete(announcements).where(eq(announcements.id, id)).returning()
    return row ?? null
  }
}
