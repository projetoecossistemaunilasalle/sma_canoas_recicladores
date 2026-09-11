import { z } from "zod"
import { weekdaySchema } from "../../lib/weekdays"

const dayOfWeek = weekdaySchema
const shift = z.enum(["manha", "tarde", "noite"])
// HH:MM or HH:MM:SS
const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/)

export const collectionRouteSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid().nullable().optional(),
  cooperativeId: z.string().uuid().nullable().optional(),
  status: z.string().default("planned"),
  totalDistanceKm: z.number().nullable().optional(),
  totalDurationSeconds: z.number().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  daysOfWeek: z.array(dayOfWeek).nullable().optional(),
  shift: shift.nullable().optional(),
  startTime: z.string().nullable().optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  createdAt: z.date().optional(),
  // True only while today is a scheduled day AND the current time is inside
  // that day's shift window — see RouteService.withRunningStatus. Distinct
  // from `status`, which currently every route sits at "active" forever
  // (there's no start/stop action), so it can't answer "is it running now".
  isRunningNow: z.boolean(),
})

export const createCollectionRouteSchema = z.object({
  vehicleId: z.uuid(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).default("planned"),
  totalDistanceKm: z.number().optional(),
  totalDurationSeconds: z.number().optional(),
  scheduledDate: z.string().optional(),
  daysOfWeek: z.array(dayOfWeek).min(1),
  shift: shift,
  startTime: timeString,
})

export const updateCollectionRouteSchema = z.object({
  vehicleId: z.uuid().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  totalDistanceKm: z.number().optional(),
  totalDurationSeconds: z.number().optional(),
  scheduledDate: z.string().optional(),
  daysOfWeek: z.array(dayOfWeek).min(1).optional(),
  shift: shift.optional(),
  startTime: timeString.optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
})

export const routeStopSchema = z.object({
  streetId: z.number(),
  stopOrder: z.number(),
  name: z.string().nullable(),
  geom: z.string(),
})

export const routePreviewSegmentSchema = z.object({
  streetId: z.number(),
  isStop: z.boolean(),
  name: z.string().nullable(),
  geom: z.string(),
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
