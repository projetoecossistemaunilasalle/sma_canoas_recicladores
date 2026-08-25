import { z } from "zod"

export const publicationSchema = z.object({
  id: z.uuid(),

  title: z.string().min(1),

  content: z.string().min(1),

  imageUrl: z.string().url().nullable().optional(),

  cooperativeId: z.uuid(),

  // Dados da cooperativa
  address: z.string().nullable().optional(),

  phone: z.string().nullable().optional(),

  weekdayHours: z.string().nullable().optional(),

  saturdayHours: z.string().nullable().optional(),

  sundayHours: z.string().nullable().optional(),

  // Foto e informação importante
  importantPhotoUrl: z.string().url().nullable().optional(),

  importantPhotoDescription: z.string().nullable().optional(),

  // Foto e informação atualizada
  updatedPhotoUrl: z.string().url().nullable().optional(),

  updatedPhotoDescription: z.string().nullable().optional(),

  photoUpdatedAt: z.date().nullable().optional(),

  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
  ]),

  createdAt: z.date().optional(),

  updatedAt: z.date().optional(),
})

export const createPublicationSchema = z.object({
  title: z.string().min(1),

  content: z.string().min(1),

  imageUrl: z.string().url().nullable().optional(),

  // Dados da cooperativa
  address: z.string().nullable().optional(),

  phone: z.string().nullable().optional(),

  weekdayHours: z.string().nullable().optional(),

  saturdayHours: z.string().nullable().optional(),

  sundayHours: z.string().nullable().optional(),

  // Foto e informação importante
  importantPhotoUrl: z.string().url().nullable().optional(),

  importantPhotoDescription: z.string().nullable().optional(),

  // Foto e informação atualizada
  updatedPhotoUrl: z.string().url().nullable().optional(),

  updatedPhotoDescription: z.string().nullable().optional(),

  photoUpdatedAt: z.coerce.date().nullable().optional(),
})

export const updatePublicationSchema = z.object({
  title: z.string().min(1).optional(),

  content: z.string().min(1).optional(),

  imageUrl: z.string().url().nullable().optional(),

  // Dados da cooperativa
  address: z.string().nullable().optional(),

  phone: z.string().nullable().optional(),

  weekdayHours: z.string().nullable().optional(),

  saturdayHours: z.string().nullable().optional(),

  sundayHours: z.string().nullable().optional(),

  // Foto e informação importante
  importantPhotoUrl: z.string().url().nullable().optional(),

  importantPhotoDescription: z.string().nullable().optional(),

  // Foto e informação atualizada
  updatedPhotoUrl: z.string().url().nullable().optional(),

  updatedPhotoDescription: z.string().nullable().optional(),

  photoUpdatedAt: z.coerce.date().nullable().optional(),
})

export const updatePublicationStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
  ]),
})