import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { StreetController } from "./street.controller"
import { streetSchema, listStreetsQuerySchema, nearestStreetQuerySchema } from "./street.schema"
import { errorResponseSchema } from "../common.schema"
import { requireAnyAuthed } from "../../middleware/auth.middleware"

const controller = new StreetController()

export const streetRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/streets",
    {
      preHandler: requireAnyAuthed,
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
      preHandler: requireAnyAuthed,
      schema: {
        summary: "Find the nearest collectible street to a point",
        tags: ["Streets"],
        querystring: nearestStreetQuerySchema,
        response: { 200: streetSchema, 404: errorResponseSchema },
      },
    },
    controller.nearest.bind(controller)
  )

  server.get(
    "/streets/:id",
    {
      preHandler: requireAnyAuthed,
      schema: {
        summary: "Get street by ID",
        tags: ["Streets"],
        params: z.object({ id: z.coerce.number() }),
        response: { 200: streetSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )
}
