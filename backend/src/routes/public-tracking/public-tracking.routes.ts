import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { PublicTrackingController } from "./public-tracking.controller"
import {
  geocodeQuerySchema,
  geocodeResultSchema,
  collectionCheckQuerySchema,
  collectionCheckResultSchema,
} from "./public-tracking.schema"

const controller = new PublicTrackingController()

// Fully public — no authenticate/requireRole preHandler. This is the one
// backend surface anonymous citizens (and the public home map) are allowed
// to call directly.
export const publicTrackingRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/public/geocode",
    {
      schema: {
        summary: "Geocode a free-text address, biased to Canoas",
        tags: ["Public"],
        querystring: geocodeQuerySchema,
        response: { 200: z.array(geocodeResultSchema) },
      },
    },
    controller.geocode.bind(controller)
  )

  server.get(
    "/public/collection-check",
    {
      schema: {
        summary: "Check whether a collection route passes near a point, and its live status",
        tags: ["Public"],
        querystring: collectionCheckQuerySchema,
        response: { 200: collectionCheckResultSchema },
      },
    },
    controller.collectionCheck.bind(controller)
  )
}
