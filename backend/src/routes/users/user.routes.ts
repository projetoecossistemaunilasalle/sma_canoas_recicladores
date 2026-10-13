import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { UserController } from "./user.controller"
import {
  userSchema,
  loginSchema,
  authResponseSchema,
  registerSchema,
  updateProfileSchema,
  pushSubscriptionSchema,
} from "./user.schema"
import { errorResponseSchema } from "../common.schema"
import { requireAuth } from "../../middleware/auth.middleware"

const controller = new UserController()

export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/login",
    {
      schema: {
        summary: "Login",
        tags: ["Auth"],
        body: loginSchema,
        response: { 200: authResponseSchema, 401: errorResponseSchema },
      },
    },
    controller.login.bind(controller)
  )

  server.post(
    "/register",
    {
      schema: {
        summary: "Public citizen self-registration",
        tags: ["Auth"],
        body: registerSchema,
        response: { 201: authResponseSchema, 409: errorResponseSchema },
      },
    },
    controller.register.bind(controller)
  )

  server.get(
    "/me",
    {
      preHandler: requireAuth,
      schema: {
        summary: "Get current user",
        tags: ["Users"],
        response: { 200: userSchema, 404: errorResponseSchema },
      },
    },
    controller.me.bind(controller)
  )

  server.put(
    "/me",
    {
      preHandler: requireAuth,
      schema: {
        summary: "Update current user's own profile",
        tags: ["Users"],
        body: updateProfileSchema,
        response: { 200: userSchema, 404: errorResponseSchema },
      },
    },
    controller.updateMe.bind(controller)
  )

  server.post(
    "/me/push-subscription",
    {
      preHandler: requireAuth,
      schema: {
        summary: "Save a Web Push subscription for the current user (turns proximity notifications on)",
        tags: ["Users"],
        body: pushSubscriptionSchema,
        response: { 204: z.null() },
      },
    },
    controller.savePushSubscription.bind(controller)
  )

  server.delete(
    "/me/push-subscription",
    {
      preHandler: requireAuth,
      schema: {
        summary: "Remove all of the current user's Web Push subscriptions (turns proximity notifications off)",
        tags: ["Users"],
        response: { 204: z.null() },
      },
    },
    controller.deletePushSubscriptions.bind(controller)
  )
}
