import { z } from "zod"
import { houseSideSchema } from "../../lib/street-side"
import { latLngTupleSchema } from "../streets/street.schema"
import { positionSchema, vehicleTypeSchema } from "../vehicles/vehicle.schema"

export const geocodeQuerySchema = z.object({
  q: z.string().min(3),
})

// One street (or one of several places sharing a street name), with a point
// on it for the map to focus on.
export const geocodeResultSchema = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  // Street name alone — lets /public/address-street prefer that street's
  // segments when the citizen places their house pin.
  road: z.string().nullable(),
  // Bairros the street runs through, the one with most of it first.
  neighborhoods: z.array(z.string()),
  // Only set when the same name occurs in more than one place within the
  // same bairro(s), to tell them apart.
  crossStreet: z.string().nullable(),
})

export const addressStreetQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  road: z.string().optional(),
})

export const addressStreetResultSchema = z.object({
  streetId: z.number(),
  name: z.string().nullable(),
  line: z.array(latLngTupleSchema), // [lat, lng][], source→target
  // Suggested from the pin's position; null when the pin sits on the street
  // centerline and the side can't be told — the citizen picks it then.
  side: houseSideSchema.nullable(),
})

// lat/lng is the citizen's house pin; streetId + side are what they
// confirmed for it (see /public/address-street).
export const collectionCheckQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  streetId: z.coerce.number().int(),
  side: houseSideSchema,
})

export const publicCooperativeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  instagram: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
})

const vehicleSummarySchema = z.object({
  id: z.uuid(),
  plate: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  type: vehicleTypeSchema,
})

const pathPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

const pathStopSchema = z.object({
  streetId: z.number(),
  name: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
})

export const collectionCheckResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("no_route"),
    street: z.string().nullable().optional(),
  }),
  // A route does collect this exact stretch of the citizen's street, just
  // only the opposite side — informational only, no ETA/push for it.
  z.object({
    status: z.literal("other_side_only"),
    street: z.string().nullable(),
    daysAhead: z.number(),
    startTime: z.string(),
  }),
  z.object({
    status: z.literal("scheduled_future"),
    street: z.string().nullable(),
    daysAhead: z.number(),
    startTime: z.string(),
    vehicle: vehicleSummarySchema,
  }),
  z.object({
    status: z.literal("scheduled_today"),
    street: z.string().nullable(),
    startTime: z.string(),
    vehicle: vehicleSummarySchema,
  }),
  z.object({
    status: z.literal("arriving"),
    street: z.string().nullable(),
    etaStatus: z.enum(["na_rua", "chegando"]),
    etaSeconds: z.number(),
    etaText: z.string(),
    distanceKm: z.number(),
    vehicle: vehicleSummarySchema,
    position: positionSchema.nullable(),
    path: z.array(pathPointSchema),
    stops: z.array(pathStopSchema),
  }),
  z.object({
    status: z.literal("passed"),
    street: z.string().nullable(),
    vehicle: vehicleSummarySchema,
    passedApproxAt: z.date().nullable(),
  }),
])
