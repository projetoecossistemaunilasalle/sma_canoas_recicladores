import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { AnnouncementController } from "./announcement.controller"
import {
  announcementSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listAnnouncementsQuerySchema,
} from "./announcement.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireAuth, requireCooperativeAdmin } from "../../middleware/auth.middleware"

const controller = new AnnouncementController()

export const announcementRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/announcements",
    {
      preHandler: requireAuth,
      schema: {
        summary: "List announcements (avisos/notícias), newest first",
        tags: ["Announcements"],
        querystring: listAnnouncementsQuerySchema,
        response: { 200: z.array(announcementSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.post(
    "/announcements",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Create an announcement for the caller's own cooperative",
        tags: ["Announcements"],
        body: createAnnouncementSchema,
        response: { 201: announcementSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/announcements/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Update one of the caller's cooperative's announcements",
        tags: ["Announcements"],
        params: idParamSchema,
        body: updateAnnouncementSchema,
        response: { 200: announcementSchema, 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/announcements/:id",
    {
      preHandler: requireCooperativeAdmin,
      schema: {
        summary: "Delete one of the caller's cooperative's announcements",
        tags: ["Announcements"],
        params: idParamSchema,
        response: { 204: z.null(), 403: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )

  server.get(
    "/announcement-images/:id",
    {
      schema: {
        summary: "An announcement image (public, cacheable forever)",
        tags: ["Announcements"],
        params: idParamSchema,
      },
    },
    controller.image.bind(controller)
  )
}
