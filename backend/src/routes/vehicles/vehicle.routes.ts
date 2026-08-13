import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { VehicleController } from "./vehicle.controller"
import { vehicleSchema, createVehicleSchema, updateVehicleSchema, vehiclePositionSchema, createPositionSchema, etaQuerySchema, etaSchema } from "./vehicle.schema"
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new VehicleController()

export const vehicleRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/vehicles",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "List vehicles",
        tags: ["Vehicles"],
        response: { 200: z.array(vehicleSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/vehicles/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get vehicle by ID",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: vehicleSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/vehicles",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Create vehicle",
        tags: ["Vehicles"],
        body: createVehicleSchema,
        response: { 201: vehicleSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/vehicles/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Update vehicle",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        body: updateVehicleSchema,
        response: { 200: vehicleSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/vehicles/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Delete vehicle",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.any(), 404: z.object({ message: z.string() }) },
      },
    },
    controller.remove.bind(controller)
  )

  server.get(
    "/vehicles/:id/positions",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get vehicle positions history",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({ limit: z.string().optional() }),
        response: { 200: z.array(vehiclePositionSchema) },
      },
    },
    controller.getPositions.bind(controller)
  )

  server.get(
    "/vehicles/:id/positions/latest",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get latest vehicle position",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: vehiclePositionSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getLatestPosition.bind(controller)
  )

  server.post(
    "/vehicles/:id/positions",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Register vehicle position",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        body: createPositionSchema,
        response: { 201: vehiclePositionSchema },
      },
    },
    controller.createPosition.bind(controller)
  )

  server.get(
    "/vehicles/:id/eta",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Check if this vehicle's route is near a given point, and its ETA",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        querystring: etaQuerySchema,
        response: { 200: etaSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getEta.bind(controller)
  )
}
