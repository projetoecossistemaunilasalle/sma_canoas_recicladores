import { eq, and } from "drizzle-orm"
import { db } from "../../db"
import {
  publications,
  type NewPublication,
} from "../../db/schema"

export class PublicationService {
  async findAll(filterCooperativeId?: string) {
    if (filterCooperativeId) {
      return db
        .select()
        .from(publications)
        .where(
          eq(
            publications.cooperativeId,
            filterCooperativeId
          )
        )
    }

    return db.select().from(publications)
  }

  async findById(
    id: string,
    filterCooperativeId?: string
  ) {
    let query = db
      .select()
      .from(publications)
      .where(eq(publications.id, id))
      .limit(1)

    if (filterCooperativeId) {
      query = db
        .select()
        .from(publications)
        .where(
          and(
            eq(publications.id, id),
            eq(
              publications.cooperativeId,
              filterCooperativeId
            )
          )
        )
        .limit(1)
    }

    const [publication] = await query

    return publication ?? null
  }

  async create(data: NewPublication) {
    const [publication] = await db
      .insert(publications)
      .values(data)
      .returning()

    return publication
  }

  async update(
    id: string,
    data: Partial<NewPublication>,
    filterCooperativeId?: string
  ) {
    const payload = {
      ...data,
      updatedAt: new Date(),
    }

    let query

    if (filterCooperativeId) {
      query = db
        .update(publications)
        .set(payload)
        .where(
          and(
            eq(publications.id, id),
            eq(
              publications.cooperativeId,
              filterCooperativeId
            )
          )
        )
        .returning()
    } else {
      query = db
        .update(publications)
        .set(payload)
        .where(eq(publications.id, id))
        .returning()
    }

    const [publication] = await query

    return publication ?? null
  }

  async updateStatus(
    id: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    filterCooperativeId?: string
  ) {
    const payload = {
      status,
      updatedAt: new Date(),
    }

    let query

    if (filterCooperativeId) {
      query = db
        .update(publications)
        .set(payload)
        .where(
          and(
            eq(publications.id, id),
            eq(
              publications.cooperativeId,
              filterCooperativeId
            )
          )
        )
        .returning()
    } else {
      query = db
        .update(publications)
        .set(payload)
        .where(eq(publications.id, id))
        .returning()
    }

    const [publication] = await query

    return publication ?? null
  }

  async delete(
    id: string,
    filterCooperativeId?: string
  ) {
    let query

    if (filterCooperativeId) {
      query = db
        .delete(publications)
        .where(
          and(
            eq(publications.id, id),
            eq(
              publications.cooperativeId,
              filterCooperativeId
            )
          )
        )
        .returning()
    } else {
      query = db
        .delete(publications)
        .where(eq(publications.id, id))
        .returning()
    }

    const [publication] = await query

    return publication ?? null
  }
}