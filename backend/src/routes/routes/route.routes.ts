import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { RouteController } from "./route.controller"
import {
  collectionRouteSchema,
  routeInputSchema,
  routeStopSchema,
  routePreviewInputSchema,
  routePreviewSegmentSchema,
} from "./route.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireCooperativeAdmin } from "../../middleware/auth.middleware"

const controller = new RouteController()

export const routeRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/routes",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "List collection routes",
        tags: ["Routes"],
        response: { 200: z.array(collectionRouteSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/routes/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Get collection route by ID",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 200: collectionRouteSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/routes",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Create a route: schedule, vehicle and stops, path-found and saved in one transaction",
        tags: ["Routes"],
        body: routeInputSchema,
        response: { 201: collectionRouteSchema, 400: errorResponseSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/routes/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Replace a route's schedule, vehicle and stops, in one transaction",
        tags: ["Routes"],
        params: idParamSchema,
        body: routeInputSchema,
        response: { 200: collectionRouteSchema, 400: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/routes/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Delete collection route",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 204: z.null(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )

  server.get(
    "/routes/:id/stops",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "List only the streets picked as stops (not the auto-filled connectors)",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 200: z.array(routeStopSchema), 404: errorResponseSchema },
      },
    },
    controller.listStops.bind(controller)
  )

  server.post(
    "/routes/preview",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Path-find between chosen stop streets without saving — for the live map preview",
        tags: ["Routes"],
        body: routePreviewInputSchema,
        response: { 200: z.array(routePreviewSegmentSchema), 400: errorResponseSchema },
      },
    },
    controller.preview.bind(controller)
  )
}
