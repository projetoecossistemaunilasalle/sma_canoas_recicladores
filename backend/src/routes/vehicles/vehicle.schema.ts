import { z } from "zod"

export const vehicleTypeSchema = z.enum(["caminhao", "bicicleta"])

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  plate: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  type: vehicleTypeSchema.default("caminhao"),
  cooperativeId: z.string().uuid().nullable().optional(),
  active: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export const createVehicleSchema = z.object({
  plate: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  type: vehicleTypeSchema.optional(),
  cooperativeId: z.string().uuid().optional(),
  active: z.boolean().optional(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

export const vehiclePositionSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  location: z.string(),
  recordedAt: z.date(),
})

export const createPositionSchema = z.object({
  location: z.string(),
})

export const etaQuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
})

export const etaSchema = z.object({
  status: z.enum(["sem_rota", "na_rua", "passou", "nao_esta_na_rota", "chegando"]),
  etaSeconds: z.number(),
  etaText: z.string(),
  distanceKm: z.number(),
  streetsRemaining: z.number(),
  currentStreet: z.string().nullable(),
  citizenStreet: z.string().nullable(),
})
