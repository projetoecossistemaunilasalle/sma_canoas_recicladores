import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { CooperativeController } from "./cooperative.controller"
import { createCooperativeSchema, updateCooperativeSchema, cooperativeSchema } from "./cooperative.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireAnyAuthed, requireAdmin, requireStaff } from "../../middleware/auth.middleware"

const controller = new CooperativeController()

export const cooperativeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/cooperatives",
    {
      preHandler: requireAnyAuthed,
      schema: {
        summary: "List all cooperatives",
        tags: ["Cooperatives"],
        response: { 200: z.array(cooperativeSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/cooperatives/:id",
    {
      preHandler: requireAnyAuthed,
      schema: {
        summary: "Get cooperative by ID",
        tags: ["Cooperatives"],
        params: idParamSchema,
        response: { 200: cooperativeSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/cooperatives",
    {
      preHandler: requireAdmin,
      schema: {
        summary: "Create cooperative",
        tags: ["Cooperatives"],
        body: createCooperativeSchema,
        response: { 201: cooperativeSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/cooperatives/:id",
    {
      // A cooperative_admin can edit its own cooperative's info (see
      // CooperativeController.update's ownership check); "admin" can edit any.
      preHandler: requireStaff,
      schema: {
        summary: "Update cooperative",
        tags: ["Cooperatives"],
        params: idParamSchema,
        body: updateCooperativeSchema,
        response: { 200: cooperativeSchema, 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/cooperatives/:id",
    {
      preHandler: requireAdmin,
      schema: {
        summary: "Delete cooperative",
        tags: ["Cooperatives"],
        params: idParamSchema,
        response: { 204: z.any(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )
}
