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
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireStaff } from "../../middleware/auth.middleware"

const controller = new VehicleController()

export const vehicleRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/vehicles",
    {
      preHandler: requireStaff,
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
      preHandler: requireStaff,
      schema: {
        summary: "Get vehicle by ID",
        tags: ["Vehicles"],
        params: idParamSchema,
        response: { 200: vehicleSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/vehicles",
    {
      preHandler: requireStaff,
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
      preHandler: requireStaff,
      schema: {
        summary: "Update vehicle",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: updateVehicleSchema,
        response: { 200: vehicleSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/vehicles/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Delete vehicle",
        tags: ["Vehicles"],
        params: idParamSchema,
        response: { 204: z.any(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )

  server.get(
    "/vehicles/:id/positions",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Get vehicle positions history",
        tags: ["Vehicles"],
        params: idParamSchema,
        querystring: z.object({ limit: z.string().optional() }),
        response: { 200: z.array(vehiclePositionSchema) },
      },
    },
    controller.getPositions.bind(controller)
  )

  server.get(
    "/vehicles/:id/positions/latest",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Get latest vehicle position",
        tags: ["Vehicles"],
        params: idParamSchema,
        response: { 200: vehiclePositionSchema, 404: errorResponseSchema },
      },
    },
    controller.getLatestPosition.bind(controller)
  )

  server.post(
    "/vehicles/:id/positions",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Register vehicle position",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: createPositionSchema,
        response: { 201: vehiclePositionSchema },
      },
    },
    controller.createPosition.bind(controller)
  )

  server.get(
    "/vehicles/:id/eta",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Check if this vehicle's route is near a given point, and its ETA",
        tags: ["Vehicles"],
        params: idParamSchema,
        querystring: etaQuerySchema,
        response: { 200: etaSchema, 404: errorResponseSchema },
      },
    },
    controller.getEta.bind(controller)
  )

  server.post(
    "/vehicles/:id/loan",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Lend a vehicle to another cooperative. Returns 409 with the conflicting routes if the vehicle is on an active route and confirmUnlink wasn't set.",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: loanVehicleSchema,
        response: {
          200: vehicleSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: routeConflictSchema,
        },
      },
    },
    controller.loan.bind(controller)
  )

  server.post(
    "/vehicles/:id/loan/return",
    {
      preHandler: requireStaff,
      schema: {
        summary: "End a vehicle's active loan. Returns 409 with the conflicting routes if the vehicle is on an active route and confirmUnlink wasn't set.",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: endLoanSchema,
        response: {
          200: vehicleSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: routeConflictSchema,
        },
      },
    },
    controller.endLoan.bind(controller)
  )
}
