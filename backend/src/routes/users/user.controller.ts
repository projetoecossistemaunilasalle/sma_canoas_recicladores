import type { FastifyReply, FastifyRequest } from "fastify"
import { UserService } from "./user.service"
import { verifyPassword } from "../../lib/password"
import { isGoogleSignInConfigured, verifyGoogleIdToken, type GoogleIdentity } from "../../lib/google-auth"
import { signToken } from "../../lib/jwt"
import type { JwtPayload } from "../../lib/jwt"
import type { User } from "../../db/schema"
import type { GoogleLoginInput, LoginInput, PushSubscriptionInput, UpdateProfileInput } from "./user.schema"

const service = new UserService()

// login() and loginWithGoogle() both mint a token for a freshly-looked-up-or-created user.
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
    // Only cooperative accounts have a password; a citizen's never matches here.
    if (!user || !user.active || !user.password || !(await verifyPassword(user.password, password))) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }
    return reply.send(buildAuthResponse(user))
  }

  // Citizen sign-in, and sign-up on the first one: there's no other way to
  // create a citizen account. Every account created here is role "user" with
  // no cooperative, which is what keeps citizens out of the dashboard (see
  // frontend/app/dashboard/layout.tsx's role gate).
  async loginWithGoogle(request: FastifyRequest<{ Body: GoogleLoginInput }>, reply: FastifyReply) {
    if (!isGoogleSignInConfigured()) {
      return reply.status(503).send({ message: "Google sign-in is not configured (GOOGLE_CLIENT_ID)" })
    }

    let identity: GoogleIdentity
    try {
      identity = await verifyGoogleIdToken(request.body.credential)
    } catch {
      return reply.status(401).send({ message: "Invalid Google credential" })
    }

    const user = await service.findOrCreateGoogleUser(identity)
    if (!user) return reply.status(409).send({ message: "E-mail já usado por outra conta" })
    if (!user.active) return reply.status(403).send({ message: "Conta desativada" })
    return reply.send(buildAuthResponse(user))
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const user = await service.findProfile(currentUser.userId)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  // A citizen editing their own profile. Same principle as loginWithGoogle():
  // role and cooperativeId are never accepted here, so this endpoint can never
  // be used to self-promote.
  async updateMe(request: FastifyRequest<{ Body: UpdateProfileInput }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const { name, address, lat, lng, addressNumber, addressStreetId, addressSide } = request.body

    const updated = await service.update(currentUser.userId, {
      name,
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
