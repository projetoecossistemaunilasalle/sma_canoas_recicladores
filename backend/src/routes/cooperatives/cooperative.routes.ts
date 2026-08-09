import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { CooperativeController } from "./cooperative.controller"
import { createCooperativeSchema, updateCooperativeSchema, cooperativeSchema } from "./cooperative.schema"
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new CooperativeController()

export const cooperativeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/cooperatives",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get cooperative by ID",
        tags: ["Cooperatives"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: cooperativeSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/cooperatives",
    {
      preHandler: [authenticate, requireRole("admin")],
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
      preHandler: [authenticate, requireRole("admin")],
      schema: {
        summary: "Update cooperative",
        tags: ["Cooperatives"],
        params: z.object({ id: z.string().uuid() }),
        body: updateCooperativeSchema,
        response: { 200: cooperativeSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/cooperatives/:id",
    {
      preHandler: [authenticate, requireRole("admin")],
      schema: {
        summary: "Delete cooperative",
        tags: ["Cooperatives"],
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.any(), 404: z.object({ message: z.string() }) },
      },
    },
    controller.remove.bind(controller)
  )
}
