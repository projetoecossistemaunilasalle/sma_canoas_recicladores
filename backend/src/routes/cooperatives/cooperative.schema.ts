import { z } from "zod"

export const cooperativeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  cnpj: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  instagram: z.string().nullable(),
  website: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  active: z.boolean(),
})

export const updateCooperativeSchema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})
