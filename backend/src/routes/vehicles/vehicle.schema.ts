import { z } from "zod"
import { weekdaySchema } from "../../lib/weekdays"

export const vehicleTypeSchema = z.enum(["caminhao", "bicicleta"])

export const positionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  recordedAt: z.date(),
})

export const vehicleSchema = z.object({
  id: z.uuid(),
  plate: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  type: vehicleTypeSchema,
  cooperativeId: z.uuid(),
  loanedToCooperativeId: z.uuid().nullable(),
  active: z.boolean(),
})

// The fleet list carries each vehicle's latest GPS fix, so the dashboard
// doesn't fetch it per vehicle.
export const vehicleWithPositionSchema = vehicleSchema.extend({
  lastPosition: positionSchema.nullable(),
})

export const vehicleInputSchema = z.object({
  plate: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  type: vehicleTypeSchema.optional(),
  active: z.boolean().optional(),
})

export const loanVehicleSchema = z.object({
  cooperativeId: z.uuid(),
  confirmUnlink: z.boolean().optional(),
})

export const endLoanSchema = z.object({
  confirmUnlink: z.boolean().optional(),
})

// 409 when lending/returning a vehicle that routes still use — the client
// lists them (in its own words) and can retry with confirmUnlink.
export const routeConflictSchema = z.object({
  message: z.string(),
  routes: z.array(
    z.object({
      id: z.uuid(),
      daysOfWeek: z.array(weekdaySchema).nullable(),
      shift: z.string().nullable(),
    })
  ),
})

export const createPositionSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export type VehicleInput = z.infer<typeof vehicleInputSchema>
