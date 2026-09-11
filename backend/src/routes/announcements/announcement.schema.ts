import { z } from "zod"
import { isValidBase64Image } from "../../lib/base64-image"

export const announcementTypeSchema = z.enum(["aviso", "noticia"])

const base64ImageSchema = z
  .string()
  .refine(isValidBase64Image, "Imagem inválida ou maior que 1MB")
  .nullable()
  .optional()

export const announcementSchema = z.object({
  id: z.uuid(),
  cooperativeId: z.uuid(),
  cooperativeName: z.string(),
  type: announcementTypeSchema,
  title: z.string().nullable(),
  body: z.string(),
  mainImage: z.string().nullable(),
  subImage1: z.string().nullable(),
  subImage2: z.string().nullable(),
  createdAt: z.date(),
})

export const createAnnouncementSchema = z.object({
  type: announcementTypeSchema.default("aviso"),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  mainImage: base64ImageSchema,
  subImage1: base64ImageSchema,
  subImage2: base64ImageSchema,
})

export const updateAnnouncementSchema = z.object({
  type: announcementTypeSchema.optional(),
  title: z.string().min(1).nullable().optional(),
  body: z.string().min(1).optional(),
  mainImage: base64ImageSchema,
  subImage1: base64ImageSchema,
  subImage2: base64ImageSchema,
})

export const listAnnouncementsQuerySchema = z.object({
  type: announcementTypeSchema.optional(),
  cooperativeId: z.uuid().optional(),
})
