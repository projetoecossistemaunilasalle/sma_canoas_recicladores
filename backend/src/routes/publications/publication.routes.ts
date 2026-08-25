import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { authenticate, requireRole } from "../../middleware/auth.middleware"
import { PublicationController } from "./publication.controller"
import {
  createPublicationSchema,
  publicationSchema,
  updatePublicationSchema,
  updatePublicationStatusSchema,
} from "./publication.schema"

const controller = new PublicationController()

export const publicationRoutes: FastifyPluginAsyncZod = async (server) => {
  // LIST PUBLICATIONS
  server.get(
    "/",
    {
      schema: {
        summary: "List publications",
        tags: ["Publications"],
        response: {
          200: publicationSchema.array(),
        },
      },
    },
    controller.list.bind(controller)
  )

  // GET PUBLICATION BY ID
  server.get(
    "/:id",
    {
      schema: {
        summary: "Get publication by ID",
        tags: ["Publications"],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: publicationSchema,
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    controller.getById.bind(controller)
  )

  // CREATE PUBLICATION
  server.post(
    "/",
    {
      preHandler: [
        authenticate,
        requireRole("admin", "cooperative_admin"),
      ],
      schema: {
        summary: "Create publication",
        tags: ["Publications"],
        body: createPublicationSchema,
        response: {
          201: publicationSchema,
          400: z.object({
            message: z.string(),
          }),
        },
      },
    },
    controller.create.bind(controller)
  )

  // UPDATE PUBLICATION
  server.patch(
    "/:id",
    {
      preHandler: [
        authenticate,
        requireRole("admin", "cooperative_admin"),
      ],
      schema: {
        summary: "Update publication",
        tags: ["Publications"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updatePublicationSchema,
        response: {
          200: publicationSchema,
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    controller.update.bind(controller)
  )

  // UPDATE PUBLICATION STATUS
  server.patch(
    "/:id/status",
    {
      preHandler: [
        authenticate,
        requireRole("admin", "cooperative_admin"),
      ],
      schema: {
        summary: "Update publication status",
        tags: ["Publications"],
        params: z.object({
          id: z.string().uuid(),
        }),
        body: updatePublicationStatusSchema,
        response: {
          200: publicationSchema,
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    controller.updateStatus.bind(controller)
  )

  // DELETE PUBLICATION
  server.delete(
    "/:id",
    {
      preHandler: [
        authenticate,
        requireRole("admin", "cooperative_admin"),
      ],
      schema: {
        summary: "Delete publication",
        tags: ["Publications"],
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          404: z.object({
            message: z.string(),
          }),
        },
      },
    },
    controller.remove.bind(controller)
  )
}