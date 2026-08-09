import { z } from "zod"

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: z.string(),
  active: z.boolean(),
  cooperativeId: z.uuid().nullable().optional(),
  address: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["user", "cooperative_admin", "admin"]).default("user"),
  cooperativeId: z.uuid().optional(),
  address: z.string().optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["user", "cooperative_admin", "admin"]).optional(),
  cooperativeId: z.uuid().optional().nullable(),
  address: z.string().optional(),
  active: z.boolean().optional(),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema.omit({ createdAt: true, updatedAt: true }),
})
