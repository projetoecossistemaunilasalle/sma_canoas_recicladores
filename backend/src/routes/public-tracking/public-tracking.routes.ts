import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { PublicTrackingController } from "./public-tracking.controller"
import {
  geocodeQuerySchema,
  geocodeResultSchema,
  addressStreetQuerySchema,
  addressStreetResultSchema,
  collectionCheckQuerySchema,
  collectionCheckResultSchema,
  publicCooperativeSchema,
} from "./public-tracking.schema"
import { errorResponseSchema } from "../common.schema"

const controller = new PublicTrackingController()

// Fully public — no authenticate/requireRole preHandler. This is the one
// backend surface anonymous citizens (and the public home map) are allowed
// to call directly.
export const publicTrackingRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/public/geocode",
    {
      schema: {
        summary: "Search Canoas streets by name, optionally with the bairro (street-level only, no house numbers)",
        tags: ["Public"],
        querystring: geocodeQuerySchema,
        response: { 200: z.array(geocodeResultSchema) },
      },
    },
    controller.geocode.bind(controller)
  )

  server.get(
    "/public/address-street",
    {
      schema: {
        summary: "Resolve which street segment a house pin sits on, and which side of it",
        tags: ["Public"],
        querystring: addressStreetQuerySchema,
        response: { 200: addressStreetResultSchema, 404: errorResponseSchema },
      },
    },
    controller.addressStreet.bind(controller)
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

  server.get(
    "/public/cooperatives",
    {
      schema: {
        summary: "List active cooperatives with a map pin location",
        tags: ["Public"],
        response: { 200: z.array(publicCooperativeSchema) },
      },
    },
    controller.cooperatives.bind(controller)
  )
}
