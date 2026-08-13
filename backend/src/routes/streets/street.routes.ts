import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { StreetController } from "./street.controller"
import { streetSchema, listStreetsQuerySchema, nearestStreetQuerySchema } from "./street.schema"
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new StreetController()

export const streetRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/streets",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Search collectible streets by name",
        tags: ["Streets"],
        querystring: listStreetsQuerySchema,
        response: { 200: z.array(streetSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/streets/nearest",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Find the nearest collectible street to a point",
        tags: ["Streets"],
        querystring: nearestStreetQuerySchema,
        response: { 200: streetSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.nearest.bind(controller)
  )

  server.get(
    "/streets/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get street by ID",
        tags: ["Streets"],
        params: z.object({ id: z.coerce.number() }),
        response: { 200: streetSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getById.bind(controller)
  )
}
