import { z } from "zod"

export const collectionRouteSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid().nullable().optional(),
  cooperativeId: z.string().uuid().nullable().optional(),
  status: z.string().default("planned"),
  totalDistanceKm: z.number().nullable().optional(),
  totalDurationSeconds: z.number().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
})

export const createCollectionRouteSchema = z.object({
  vehicleId: z.uuid(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).default("planned"),
  totalDistanceKm: z.number().optional(),
  totalDurationSeconds: z.number().optional(),
  scheduledDate: z.string().optional(),
})

export const updateCollectionRouteSchema = z.object({
  vehicleId: z.uuid().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  totalDistanceKm: z.number().optional(),
  totalDurationSeconds: z.number().optional(),
  scheduledDate: z.string().optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
})

export const routeStreetSchema = z.object({
  id: z.uuid(),
  routeId: z.uuid(),
  streetId: z.number(),
  stopOrder: z.number(),
  direction: z.string().default("forward"),
  distanceFromPreviousKm: z.number().nullable().optional(),
  durationFromPreviousSeconds: z.number().nullable().optional(),
})

export const createRouteStreetSchema = z.object({
  streetId: z.number(),
  stopOrder: z.number(),
  direction: z.enum(["forward", "reverse"]).default("forward"),
  distanceFromPreviousKm: z.number().optional(),
  durationFromPreviousSeconds: z.number().optional(),
})

export const updateRouteStreetSchema = z.object({
  streetId: z.number().optional(),
  stopOrder: z.number().optional(),
  direction: z.enum(["forward", "reverse"]).optional(),
  distanceFromPreviousKm: z.number().optional(),
  durationFromPreviousSeconds: z.number().optional(),
})
