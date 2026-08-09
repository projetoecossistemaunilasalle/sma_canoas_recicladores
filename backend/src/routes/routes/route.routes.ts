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
} from "./route.schema"
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new RouteController()

export const routeRoutes: FastifyPluginAsyncZod = async (server) => {
  // ==================== COLLECTION ROUTES ====================
  server.get(
    "/routes",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "Get collection route by ID",
        tags: ["Routes"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: collectionRouteSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/routes",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Update collection route",
        tags: ["Routes"],
        params: z.object({ id: z.string().uuid() }),
        body: updateCollectionRouteSchema,
        response: { 200: collectionRouteSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/routes/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Delete collection route",
        tags: ["Routes"],
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.any(), 404: z.object({ message: z.string() }) },
      },
    },
    controller.remove.bind(controller)
  )

  // ==================== ROUTE STREETS ====================
  server.get(
    "/routes/:id/streets",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin", "user")],
      schema: {
        summary: "List streets of a route",
        tags: ["Routes"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.array(routeStreetSchema) },
      },
    },
    controller.listStreets.bind(controller)
  )

  server.post(
    "/routes/:id/streets",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Add street to route",
        tags: ["Routes"],
        params: z.object({ id: z.string().uuid() }),
        body: createRouteStreetSchema,
        response: { 201: routeStreetSchema },
      },
    },
    controller.addStreet.bind(controller)
  )

  server.put(
    "/routes/:routeId/streets/:streetId",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Update route street",
        tags: ["Routes"],
        params: z.object({ routeId: z.string().uuid(), streetId: z.string().uuid() }),
        body: updateRouteStreetSchema,
        response: { 200: routeStreetSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.updateStreet.bind(controller)
  )

  server.delete(
    "/routes/:routeId/streets/:streetId",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Remove street from route",
        tags: ["Routes"],
        params: z.object({ routeId: z.string().uuid(), streetId: z.string().uuid() }),
        response: { 204: z.any(), 404: z.object({ message: z.string() }) },
      },
    },
    controller.removeStreet.bind(controller)
  )
}
