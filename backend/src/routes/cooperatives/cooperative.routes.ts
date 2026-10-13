import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { CooperativeController } from "./cooperative.controller"
import { updateCooperativeSchema, cooperativeSchema } from "./cooperative.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireAuth, requireCooperativeAdmin } from "../../middleware/auth.middleware"

const controller = new CooperativeController()

export const cooperativeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/cooperatives",
    {
      preHandler: requireAuth,
      schema: {
        summary: "List the active cooperatives",
        tags: ["Cooperatives"],
        response: { 200: z.array(cooperativeSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/cooperatives/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Get the caller's own cooperative by ID",
        tags: ["Cooperatives"],
        params: idParamSchema,
        response: { 200: cooperativeSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )

  server.put(
    "/cooperatives/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Update the caller's own cooperative",
        tags: ["Cooperatives"],
        params: idParamSchema,
        body: updateCooperativeSchema,
        response: { 200: cooperativeSchema, 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )
}
