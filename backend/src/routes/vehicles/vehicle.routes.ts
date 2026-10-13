import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { VehicleController } from "./vehicle.controller"
import {
  vehicleSchema,
  vehicleWithPositionSchema,
  vehicleInputSchema,
  positionSchema,
  createPositionSchema,
  loanVehicleSchema,
  endLoanSchema,
  routeConflictSchema,
} from "./vehicle.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireCooperativeAdmin } from "../../middleware/auth.middleware"

const controller = new VehicleController()

const loanResponses = {
  200: vehicleSchema,
  400: errorResponseSchema,
  404: errorResponseSchema,
  409: routeConflictSchema,
}

export const vehicleRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/vehicles",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "List the caller's vehicles (owned or borrowed), each with its latest GPS position",
        tags: ["Vehicles"],
        response: { 200: z.array(vehicleWithPositionSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/vehicles/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Get one of the caller's own vehicles",
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
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Create vehicle",
        tags: ["Vehicles"],
        body: vehicleInputSchema,
        response: { 201: vehicleSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/vehicles/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Update one of the caller's own vehicles",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: vehicleInputSchema,
        response: { 200: vehicleSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/vehicles/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Delete one of the caller's own vehicles",
        tags: ["Vehicles"],
        params: idParamSchema,
        response: { 204: z.null(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )

  server.post(
    "/vehicles/:id/positions",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Register a GPS position for a vehicle the caller drives (manual feed / simulation)",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: createPositionSchema,
        response: { 201: positionSchema, 404: errorResponseSchema },
      },
    },
    controller.createPosition.bind(controller)
  )

  server.post(
    "/vehicles/:id/loan",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Lend a vehicle to another cooperative. 409 with the routes using it unless confirmUnlink is set.",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: loanVehicleSchema,
        response: loanResponses,
      },
    },
    controller.loan.bind(controller)
  )

  server.post(
    "/vehicles/:id/loan/return",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "End a vehicle's loan. 409 with the routes using it unless confirmUnlink is set.",
        tags: ["Vehicles"],
        params: idParamSchema,
        body: endLoanSchema,
        response: loanResponses,
      },
    },
    controller.endLoan.bind(controller)
  )
}
