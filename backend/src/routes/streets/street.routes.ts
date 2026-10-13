import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { StreetController } from "./street.controller"
import { streetSchema, nearestStreetQuerySchema } from "./street.schema"
import { errorResponseSchema } from "../common.schema"
import { requireAuth, requireCooperativeAdmin } from "../../middleware/auth.middleware"

const controller = new StreetController()

export const streetRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/streets/nearest",
    {
      // The route builder's "click a street" — staff only.
      preHandler: requireCooperativeAdmin,
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
      // Also the citizen profile's own street (public OSM data either way).
      preHandler: requireAuth,
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
