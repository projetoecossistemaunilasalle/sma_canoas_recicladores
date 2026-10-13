import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "../../db"
import { announcementImages, announcements, cooperatives } from "../../db/schema"
import { decodeBase64Image } from "../../lib/base64-image"
import type { CreateAnnouncementInput, ImageSlot, ListAnnouncementsQuery, UpdateAnnouncementInput } from "./announcement.schema"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// Table-qualified on purpose: Drizzle can render ${announcements.id} as a
// bare "id", which inside this subquery would mean ai.id.
function imageIdIn(slot: ImageSlot) {
  return sql<string | null>`(
    SELECT ai.id FROM ${announcementImages} ai
    WHERE ai.announcement_id = ${announcements}.id AND ai.slot = ${slot}
  )`
}

const selection = {
  id: announcements.id,
  cooperativeId: announcements.cooperativeId,
  cooperativeName: cooperatives.name,
  type: announcements.type,
  title: announcements.title,
  body: announcements.body,
  mainImageId: imageIdIn("main"),
  subImage1Id: imageIdIn("sub1"),
  subImage2Id: imageIdIn("sub2"),
  createdAt: announcements.createdAt,
}

// The API's mainImage/subImage1/subImage2 fields, by storage slot.
const IMAGE_FIELDS: [ImageSlot, "mainImage" | "subImage1" | "subImage2"][] = [
  ["main", "mainImage"],
  ["sub1", "subImage1"],
  ["sub2", "subImage2"],
]

// undefined = leave the slot as is; null = clear it; a data URL = replace it
// (as a new row, so the old URL never starts serving different bytes).
async function writeImages(tx: Tx, announcementId: string, input: UpdateAnnouncementInput) {
  for (const [slot, field] of IMAGE_FIELDS) {
    const value = input[field]
    if (value === undefined) continue
    await tx
      .delete(announcementImages)
      .where(and(eq(announcementImages.announcementId, announcementId), eq(announcementImages.slot, slot)))
    if (value !== null) {
      await tx.insert(announcementImages).values({ announcementId, slot, ...decodeBase64Image(value) })
    }
  }
}

export class AnnouncementService {
  async findAll(filter: ListAnnouncementsQuery = {}) {
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

  async create(cooperativeId: string, { type, title, body, ...images }: CreateAnnouncementInput) {
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(announcements).values({ cooperativeId, type, title, body }).returning({ id: announcements.id })
      await writeImages(tx, row.id, images)
      return row.id
    })
    return (await this.findById(id))!
  }

  async update(id: string, { type, title, body, ...images }: UpdateAnnouncementInput) {
    await db.transaction(async (tx) => {
      if (type !== undefined || title !== undefined || body !== undefined) {
        await tx.update(announcements).set({ type, title, body }).where(eq(announcements.id, id))
      }
      await writeImages(tx, id, images)
    })
    return this.findById(id)
  }

  async delete(id: string) {
    await db.delete(announcements).where(eq(announcements.id, id))
  }

  async findImage(id: string) {
    const [image] = await db
      .select({ mime: announcementImages.mime, data: announcementImages.data })
      .from(announcementImages)
      .where(eq(announcementImages.id, id))
      .limit(1)
    return image ?? null
  }
}
