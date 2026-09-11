import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { RouteController } from "./route.controller"
import {
  collectionRouteSchema,
  createCollectionRouteSchema,
  updateCollectionRouteSchema,
  routeStreetSchema,
  createRouteStreetSchema,
  updateRouteStreetSchema,
  routeStopSchema,
  routePreviewSegmentSchema,
} from "./route.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireStaff } from "../../middleware/auth.middleware"

const controller = new RouteController()

export const routeRoutes: FastifyPluginAsyncZod = async (server) => {
  // ==================== COLLECTION ROUTES ====================
  server.get(
    "/routes",
    {
      preHandler: requireStaff,
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
      preHandler: requireStaff,
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
      preHandler: requireStaff,
      schema: {
        summary: "Create collection route",
        tags: ["Routes"],
        body: createCollectionRouteSchema,
        response: { 201: collectionRouteSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/routes/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Update collection route",
        tags: ["Routes"],
        params: idParamSchema,
        body: updateCollectionRouteSchema,
        response: { 200: collectionRouteSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/routes/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Delete collection route",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 204: z.any(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )

  // ==================== ROUTE STREETS ====================
  server.get(
    "/routes/:id/streets",
    {
      preHandler: requireStaff,
      schema: {
        summary: "List streets of a route",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 200: z.array(routeStreetSchema) },
      },
    },
    controller.listStreets.bind(controller)
  )

  server.get(
    "/routes/:id/stops",
    {
      preHandler: requireStaff,
      schema: {
        summary: "List only the streets originally picked as stops (not the auto-filled connectors)",
        tags: ["Routes"],
        params: idParamSchema,
        response: { 200: z.array(routeStopSchema) },
      },
    },
    controller.listStops.bind(controller)
  )

  server.post(
    "/routes/:id/streets",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Add street to route",
        tags: ["Routes"],
        params: idParamSchema,
        body: createRouteStreetSchema,
        response: { 201: routeStreetSchema },
      },
    },
    controller.addStreet.bind(controller)
  )

  server.put(
    "/routes/:routeId/streets/:streetId",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Update route street",
        tags: ["Routes"],
        params: z.object({ routeId: z.string().uuid(), streetId: z.string().uuid() }),
        body: updateRouteStreetSchema,
        response: { 200: routeStreetSchema, 404: errorResponseSchema },
      },
    },
    controller.updateStreet.bind(controller)
  )

  server.delete(
    "/routes/:routeId/streets/:streetId",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Remove street from route",
        tags: ["Routes"],
        params: z.object({ routeId: z.string().uuid(), streetId: z.string().uuid() }),
        response: { 204: z.any(), 404: errorResponseSchema },
      },
    },
    controller.removeStreet.bind(controller)
  )

  // ==================== ROUTE PLANNING ====================
  server.post(
    "/routes/:id/plan",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Plan a route: path-find between chosen stop streets and materialize route_streets",
        tags: ["Routes"],
        params: idParamSchema,
        body: z.object({ streetIds: z.array(z.number().int()).min(1) }),
        response: {
          200: z.array(routeStreetSchema),
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    controller.plan.bind(controller)
  )

  server.post(
    "/routes/preview",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Path-find between chosen stop streets without persisting — for live map preview",
        tags: ["Routes"],
        body: z.object({ streetIds: z.array(z.number().int()).min(1) }),
        response: {
          200: z.array(routePreviewSegmentSchema),
          400: errorResponseSchema,
        },
      },
    },
    controller.preview.bind(controller)
  )
}
