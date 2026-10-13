import { z } from "zod"

export const latLngTupleSchema = z.tuple([z.number(), z.number()])

export const streetSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  line: z.array(latLngTupleSchema), // [lat, lng][], in the segment's source→target direction
})

export const nearestStreetQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
})
