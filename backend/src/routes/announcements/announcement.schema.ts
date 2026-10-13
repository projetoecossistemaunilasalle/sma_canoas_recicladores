import { z } from "zod"
import { isValidBase64Image } from "../../lib/base64-image"

export const announcementTypeSchema = z.enum(["aviso", "noticia"])

export type ImageSlot = "main" | "sub1" | "sub2"

// Sent as a data URL; stored as bytes and served back by URL (see
// GET /announcement-images/:id). On update: omitted = keep, null = remove.
const imageInputSchema = z
  .string()
  .refine(isValidBase64Image, "Imagem inválida ou maior que 1MB")
  .nullable()
  .optional()

const imageInputs = {
  mainImage: imageInputSchema,
  subImage1: imageInputSchema,
  subImage2: imageInputSchema,
}

export const announcementSchema = z.object({
  id: z.uuid(),
  cooperativeId: z.uuid(),
  cooperativeName: z.string(),
  type: announcementTypeSchema,
  title: z.string().nullable(),
  body: z.string(),
  // Ids for GET /announcement-images/:id — never the bytes themselves, so
  // listing the feed stays small and each image is cached on its own.
  mainImageId: z.uuid().nullable(),
  subImage1Id: z.uuid().nullable(),
  subImage2Id: z.uuid().nullable(),
  createdAt: z.date(),
})

export const createAnnouncementSchema = z.object({
  type: announcementTypeSchema.default("aviso"),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  ...imageInputs,
})

export const updateAnnouncementSchema = z.object({
  type: announcementTypeSchema.optional(),
  title: z.string().min(1).nullable().optional(),
  body: z.string().min(1).optional(),
  ...imageInputs,
})

export const listAnnouncementsQuerySchema = z.object({
  type: announcementTypeSchema.optional(),
  cooperativeId: z.uuid().optional(),
})

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>
