import { z } from "zod"

export const geocodeQuerySchema = z.object({
  q: z.string().min(3),
})

export const geocodeResultSchema = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
})

export const collectionCheckQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
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
  id: z.string().uuid(),
  plate: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  type: z.string(),
})

const positionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  recordedAt: z.date(),
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
