import { z } from "zod"

export const cooperativeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  cnpj: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export const createCooperativeSchema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
})

export const updateCooperativeSchema = createCooperativeSchema.partial()
