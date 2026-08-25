import { z } from "zod"

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: z.string(),
  active: z.boolean(),
  cooperativeId: z.uuid().nullable().optional(),
  address: z.string().nullable().optional(),
  addressLat: z.number().nullable().optional(),
  addressLng: z.number().nullable().optional(),
  notifyProximity: z.boolean().optional(),
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

// Public citizen self-registration — deliberately has no role/cooperativeId
// field at all, so there's nothing for a client to even attempt to escalate.
export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

// A citizen editing their own profile — same no-role/no-cooperativeId
// principle as registerSchema.
export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notifyProximity: z.boolean().optional(),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})
