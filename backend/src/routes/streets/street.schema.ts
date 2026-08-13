import { z } from "zod"

export const streetSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  geom: z.string(), // WKT LineString, via ST_AsText
  highwayType: z.string().nullable(),
  requiresCollection: z.boolean().nullable(),
  lengthKm: z.number().nullable(),
  source: z.number().nullable(),
  target: z.number().nullable(),
})

export const listStreetsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const nearestStreetQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
})
