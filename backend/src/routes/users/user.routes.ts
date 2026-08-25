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
import { authenticate, requireRole } from "../../middleware/auth.middleware"

const controller = new UserController()

export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/login",
    {
      schema: {
        summary: "Login",
        tags: ["Auth"],
        body: loginSchema,
        response: { 200: loginResponseSchema, 401: z.object({ message: z.string() }) },
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
        response: { 201: loginResponseSchema, 409: z.object({ message: z.string() }) },
      },
    },
    controller.register.bind(controller)
  )

  server.get(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        summary: "Get current user",
        tags: ["Users"],
        response: { 200: userSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.me.bind(controller)
  )

  server.put(
    "/me",
    {
      preHandler: [authenticate],
      schema: {
        summary: "Update current user's own profile",
        tags: ["Users"],
        body: updateProfileSchema,
        response: { 200: userSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.updateMe.bind(controller)
  )

  server.post(
    "/me/push-subscription",
    {
      preHandler: [authenticate],
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
      preHandler: [authenticate],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Get user by ID",
        tags: ["Users"],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: userSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.getById.bind(controller)
  )

  server.post(
    "/users",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
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
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Update user",
        tags: ["Users"],
        params: z.object({ id: z.string().uuid() }),
        body: updateUserSchema,
        response: { 200: userSchema, 404: z.object({ message: z.string() }) },
      },
    },
    controller.update.bind(controller)
  )

  server.delete(
    "/users/:id",
    {
      preHandler: [authenticate, requireRole("admin", "cooperative_admin")],
      schema: {
        summary: "Delete user",
        tags: ["Users"],
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.any(), 404: z.object({ message: z.string() }) },
      },
    },
    controller.remove.bind(controller)
  )
}
