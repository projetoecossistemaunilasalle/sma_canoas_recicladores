import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { VehicleController } from "./vehicle.controller"
import {
  vehicleSchema,
  createVehicleSchema,
  updateVehicleSchema,
  vehiclePositionSchema,
  createPositionSchema,
  etaQuerySchema,
  etaSchema,
  loanVehicleSchema,
  endLoanSchema,
  routeConflictSchema,
} from "./vehicle.schema"
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new VehicleController()

export const vehicleRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/vehicles",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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

  server.post(
    "/vehicles/:id/loan",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Lend a vehicle to another cooperative. Returns 409 with the conflicting routes if the vehicle is on an active route and confirmUnlink wasn't set.",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        body: loanVehicleSchema,
        response: {
          200: vehicleSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          409: routeConflictSchema,
        },
      },
    },
    controller.loan.bind(controller)
  )

  server.post(
    "/vehicles/:id/loan/return",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "End a vehicle's active loan. Returns 409 with the conflicting routes if the vehicle is on an active route and confirmUnlink wasn't set.",
        tags: ["Vehicles"],
        params: z.object({ id: z.string().uuid() }),
        body: endLoanSchema,
        response: {
          200: vehicleSchema,
          400: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          409: routeConflictSchema,
        },
      },
    },
    controller.endLoan.bind(controller)
  )
}
