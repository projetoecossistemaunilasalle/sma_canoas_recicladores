import { z } from "zod"
import { houseSideSchema } from "../../lib/street-side"

// Emails are stored lowercase (users.email has a CHECK) — normalizing on the
// way in is what keeps "Admin@x.com" and "admin@x.com" the same account.
const emailSchema = z.email().trim().toLowerCase()

const roleSchema = z.enum(["user", "cooperative_admin"])

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  role: roleSchema,
  active: z.boolean(),
  cooperativeId: z.uuid().nullable(),
  address: z.string().nullable(),
  addressLat: z.number().nullable(),
  addressLng: z.number().nullable(),
  addressNumber: z.string().nullable(),
  addressStreetId: z.number().nullable(),
  addressSide: houseSideSchema.nullable(),
  // Derived: true while the user has at least one Web Push subscription.
  notifyProximity: z.boolean(),
})

// The citizen's address as set in register/profile: lat/lng is the pin they
// put on their house, addressStreetId/addressSide what they confirmed for it
// (see /public/address-street). The pin is useless for collection checks
// without the other two, so the four go together or not at all.
const citizenAddressFields = {
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  addressNumber: z.string().trim().max(20).nullable().optional(),
  addressStreetId: z.number().int().optional(),
  addressSide: houseSideSchema.optional(),
}

function isAddressComplete(v: { lat?: number; lng?: number; addressStreetId?: number; addressSide?: string }) {
  const parts = [v.lat, v.lng, v.addressStreetId, v.addressSide]
  return parts.every((p) => p === undefined) || parts.every((p) => p !== undefined)
}

const incompleteAddressError = {
  message: "lat, lng, addressStreetId and addressSide must be sent together",
  path: ["addressSide"],
}

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.email(),
    role: roleSchema,
    cooperativeId: z.uuid().nullable(),
  }),
})

// Public citizen self-registration — deliberately has no role/cooperativeId
// field at all, so there's nothing for a client to even attempt to escalate.
export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: emailSchema,
    password: z.string().min(6),
    ...citizenAddressFields,
  })
  .refine(isAddressComplete, incompleteAddressError)

// A citizen editing their own profile — same no-role/no-cooperativeId
// principle as registerSchema.
export const updateProfileSchema = z
  .object({
    name: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    ...citizenAddressFields,
  })
  .refine(isAddressComplete, incompleteAddressError)

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

export const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>
