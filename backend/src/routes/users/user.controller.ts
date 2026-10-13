import type { FastifyReply, FastifyRequest } from "fastify"
import { UserService } from "./user.service"
import { verifyPassword } from "../../lib/password"
import { signToken } from "../../lib/jwt"
import type { JwtPayload } from "../../lib/jwt"
import type { User } from "../../db/schema"
import type { LoginInput, PushSubscriptionInput, RegisterInput, UpdateProfileInput } from "./user.schema"

const service = new UserService()

// login() and register() both mint a token for a freshly-looked-up-or-created user.
function buildAuthResponse(user: User) {
  const { id, name, email, role, cooperativeId } = user
  return {
    token: signToken({ userId: id, email, role, cooperativeId }),
    user: { id, name, email, role, cooperativeId },
  }
}

export class UserController {
  async login(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) {
    const { email, password } = request.body
    const user = await service.findByEmail(email)
    if (!user || !user.active || !(await verifyPassword(user.password, password))) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }
    return reply.send(buildAuthResponse(user))
  }

  // Public citizen self-registration. Deliberately never reads role/cooperativeId
  // from the request body — every account created here is role "user" with no
  // cooperative, which is what keeps citizens out of the dashboard (see
  // frontend/app/dashboard/layout.tsx's role gate).
  async register(request: FastifyRequest<{ Body: RegisterInput }>, reply: FastifyReply) {
    const { name, email, password, address, lat, lng, addressNumber, addressStreetId, addressSide } = request.body

    if (await service.findByEmail(email)) return reply.status(409).send({ message: "E-mail já cadastrado" })

    const user = await service.create({
      name,
      email,
      password,
      role: "user",
      address,
      addressLat: lat,
      addressLng: lng,
      addressNumber,
      addressStreetId,
      addressSide,
    })

    return reply.status(201).send(buildAuthResponse(user))
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const user = await service.findProfile(currentUser.userId)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  // A citizen editing their own profile. Same principle as register(): role
  // and cooperativeId are never accepted here, so this endpoint can never be
  // used to self-promote.
  async updateMe(request: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const { name, password, address, lat, lng, addressNumber, addressStreetId, addressSide } = request.body

    const updated = await service.update(currentUser.userId, {
      name,
      password,
      address,
      addressLat: lat,
      addressLng: lng,
      addressNumber,
      addressStreetId,
      addressSide,
    })
    if (!updated) return reply.status(404).send({ message: "User not found" })
    return reply.send(await service.findProfile(currentUser.userId))
  }

  async savePushSubscription(request: FastifyRequest<{ Body: PushSubscriptionInput }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const { endpoint, keys } = request.body
    await service.savePushSubscription({ userId: currentUser.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    return reply.status(204).send()
  }

  // Notifications are on while any subscription exists, so "off" clears them
  // all — on every device, not just the browser that asked.
  async deletePushSubscriptions(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    await service.deletePushSubscriptions(currentUser.userId)
    return reply.status(204).send()
  }
}
