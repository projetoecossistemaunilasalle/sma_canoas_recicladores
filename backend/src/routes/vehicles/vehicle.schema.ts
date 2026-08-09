import { z } from "zod"

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  plate: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  cooperativeId: z.string().uuid().nullable().optional(),
  active: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export const createVehicleSchema = z.object({
  plate: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  cooperativeId: z.string().uuid().optional(),
  active: z.boolean().optional(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

export const vehiclePositionSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  location: z.string(),
  recordedAt: z.string().datetime(),
})

export const createPositionSchema = z.object({
  location: z.string(),
})
