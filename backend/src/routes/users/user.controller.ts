import type { FastifyReply, FastifyRequest } from "fastify"
import type { z } from "zod"
import { UserService } from "./user.service"
import { verifyPassword } from "../../lib/password"
import { signToken } from "../../lib/jwt"
import type { JwtPayload } from "../../lib/jwt"
import { getCooperativeFilter, scopeCooperativeId } from "../../middleware/auth.middleware"
import type { User } from "../../db/schema"
import type { createUserSchema, updateUserSchema } from "./user.schema"

const service = new UserService()

// login() and register() both mint a token for a freshly-looked-up-or-created
// user and shape the same 7-field response around it.
function buildAuthResponse(user: User) {
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    cooperativeId: user.cooperativeId,
  })
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      cooperativeId: user.cooperativeId,
      address: user.address,
    },
  }
}

export class UserController {
  async login(request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) {
    const { email, password } = request.body
    const user = await service.findByEmail(email)
    if (!user || !user.active) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    const valid = await verifyPassword(user.password, password)
    if (!valid) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    return reply.send(buildAuthResponse(user))
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const list = await service.findAll(filter)
    return reply.send(list)
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const user = await service.findById(request.params.id, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  async create(request: FastifyRequest<{ Body: z.infer<typeof createUserSchema> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const cooperativeId = scopeCooperativeId(currentUser, request.body.cooperativeId)
    const user = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(user)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateUserSchema> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const filter = getCooperativeFilter(request)

    if (currentUser.role === "cooperative_admin" && request.body.role) {
      delete request.body.role
    }
    if (currentUser.role === "cooperative_admin" && request.body.cooperativeId) {
      delete request.body.cooperativeId
    }

    const user = await service.update(request.params.id, request.body, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const user = await service.delete(request.params.id, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.status(204).send()
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const user = await service.findById(currentUser.userId)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  // Public citizen self-registration. Deliberately never reads role/cooperativeId
  // from the request body — every account created here is role "user" with no
  // cooperative, which is what keeps citizens out of the dashboard (see
  // frontend/app/dashboard/layout.tsx's role gate).
  async register(
    request: FastifyRequest<{ Body: { name: string; email: string; password: string; address?: string; lat?: number; lng?: number } }>,
    reply: FastifyReply
  ) {
    const { name, email, password, address, lat, lng } = request.body

    const existing = await service.findByEmail(email)
    if (existing) return reply.status(409).send({ message: "E-mail já cadastrado" })

    const user = await service.create({
      name,
      email,
      password,
      role: "user",
      cooperativeId: undefined,
      address,
      addressLat: lat,
      addressLng: lng,
    })

    return reply.status(201).send(buildAuthResponse(user))
  }

  // A citizen editing their own profile. Same principle as register(): role
  // and cooperativeId are never accepted here, so this endpoint can never be
  // used to self-promote.
  async updateMe(
    request: FastifyRequest<{ Body: { name?: string; password?: string; address?: string; lat?: number; lng?: number; notifyProximity?: boolean } }>,
    reply: FastifyReply
  ) {
    const currentUser = request.user as JwtPayload
    const { name, password, address, lat, lng, notifyProximity } = request.body

    const user = await service.update(currentUser.userId, {
      name,
      password,
      address,
      addressLat: lat,
      addressLng: lng,
      notifyProximity,
    })
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  async savePushSubscription(
    request: FastifyRequest<{ Body: { endpoint: string; keys: { p256dh: string; auth: string } } }>,
    reply: FastifyReply
  ) {
    const currentUser = request.user as JwtPayload
    const { endpoint, keys } = request.body
    await service.savePushSubscription({ userId: currentUser.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    return reply.status(204).send()
  }

  async deletePushSubscription(
    request: FastifyRequest<{ Body: { endpoint: string } }>,
    reply: FastifyReply
  ) {
    const currentUser = request.user as JwtPayload
    await service.deletePushSubscription(currentUser.userId, request.body.endpoint)
    return reply.status(204).send()
  }
}
