import { z } from "zod"
import { weekdaySchema } from "../../lib/weekdays"
import { collectionSideSchema } from "../../lib/street-side"
import { latLngTupleSchema } from "../streets/street.schema"

const shiftSchema = z.enum(["manha", "tarde", "noite"])
// HH:MM or HH:MM:SS
const timeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/)

export const collectionRouteSchema = z.object({
  id: z.uuid(),
  vehicleId: z.uuid().nullable(),
  cooperativeId: z.uuid(),
  totalDistanceKm: z.number().nullable(),
  totalDurationSeconds: z.number().nullable(),
  daysOfWeek: z.array(weekdaySchema).nullable(),
  shift: shiftSchema.nullable(),
  startTime: z.string().nullable(),
  createdAt: z.date(),
  // True only while today is a scheduled day AND the current time is inside
  // that day's shift window — see RouteService.withRunningStatus.
  isRunningNow: z.boolean(),
})

const fraction = z.number().min(0).max(1)

// One stop the cooperative picked — which side of the segment is collected
// and which stretch of it (see route_streets in schema.ts). Defaults = the
// whole segment, both sides.
export const routeStopInputSchema = z
  .object({
    streetId: z.number().int(),
    side: collectionSideSchema.default("both"),
    startFraction: fraction.default(0),
    endFraction: fraction.default(1),
  })
  .refine((s) => s.startFraction < s.endFraction, {
    message: "startFraction must be smaller than endFraction",
    path: ["endFraction"],
  })

// Create and update take the whole route at once — schedule and stops — and
// save it in one transaction, so a route is never left without its streets.
export const routeInputSchema = z.object({
  vehicleId: z.uuid(),
  daysOfWeek: z.array(weekdaySchema).min(1),
  shift: shiftSchema,
  startTime: timeString,
  stops: z.array(routeStopInputSchema).min(1),
})

export const routeStopSchema = z.object({
  streetId: z.number(),
  stopOrder: z.number(),
  name: z.string().nullable(),
  line: z.array(latLngTupleSchema),
  side: collectionSideSchema,
  startFraction: z.number(),
  endFraction: z.number(),
})

export const routePreviewInputSchema = z.object({
  streetIds: z.array(z.number().int()).min(1),
})

export const routePreviewSegmentSchema = z.object({
  streetId: z.number(),
  isStop: z.boolean(),
  name: z.string().nullable(),
  line: z.array(latLngTupleSchema),
})

export type RouteInput = z.infer<typeof routeInputSchema>
