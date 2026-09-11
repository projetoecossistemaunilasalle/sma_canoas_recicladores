import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod"
import { z } from "zod"
import { UserController } from "./user.controller"
import {
  createUserSchema,
  updateUserSchema,
  userSchema,
  loginSchema,
  loginResponseSchema,
  registerSchema,
  updateProfileSchema,
  pushSubscriptionSchema,
} from "./user.schema"
import { errorResponseSchema, idParamSchema } from "../common.schema"
import { requireAuth, requireStaff } from "../../middleware/auth.middleware"

const controller = new UserController()

export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/login",
    {
      schema: {
        summary: "Login",
        tags: ["Auth"],
        body: loginSchema,
        response: { 200: loginResponseSchema, 401: errorResponseSchema },
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
        response: { 201: loginResponseSchema, 409: errorResponseSchema },
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
        summary: "Save a Web Push subscription for the current user",
        tags: ["Users"],
        body: pushSubscriptionSchema,
        response: { 204: z.any() },
      },
    },
    controller.savePushSubscription.bind(controller)
  )

  server.delete(
    "/me/push-subscription",
    {
      preHandler: requireAuth,
      schema: {
        summary: "Remove a Web Push subscription for the current user",
        tags: ["Users"],
        body: z.object({ endpoint: z.string() }),
        response: { 204: z.any() },
      },
    },
    controller.deletePushSubscription.bind(controller)
  )

  server.get(
    "/users",
    {
      preHandler: requireStaff,
      schema: {
        summary: "List users",
        tags: ["Users"],
        response: { 200: z.array(userSchema) },
      },
    },
    controller.list.bind(controller)
  )

  server.get(
    "/users/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Get user by ID",
        tags: ["Users"],
        params: idParamSchema,
        response: { 200: userSchema, 404: errorResponseSchema },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/users",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Create user",
        tags: ["Users"],
        body: createUserSchema,
        response: { 201: userSchema },
      },
    },
    controller.create.bind(controller)
  )

  server.put(
    "/users/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Update user",
        tags: ["Users"],
        params: idParamSchema,
        body: updateUserSchema,
        response: { 200: userSchema, 404: errorResponseSchema },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/users/:id",
    {
      preHandler: requireStaff,
      schema: {
        summary: "Delete user",
        tags: ["Users"],
        params: idParamSchema,
        response: { 204: z.any(), 404: errorResponseSchema },
      },
    },
    controller.remove.bind(controller)
  )
}
