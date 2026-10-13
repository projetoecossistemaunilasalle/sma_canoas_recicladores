import type { FastifyReply, FastifyRequest } from "fastify"
import { verifyToken, type JwtPayload } from "../lib/jwt"

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ message: "Unauthorized: missing token" })
    }

    const token = authHeader.slice(7)
    const decoded = verifyToken(token)
    request.user = decoded
  } catch {
    return reply.status(401).send({ message: "Unauthorized: invalid token" })
  }
}

async function cooperativeAdminOnly(request: FastifyRequest, reply: FastifyReply) {
  if (request.user?.role !== "cooperative_admin" || !request.user.cooperativeId) {
    return reply.status(403).send({ message: "Forbidden: insufficient permissions" })
  }
}

// Any signed-in user (citizens included).
export const requireAuth = [authenticate]
// The cooperative dashboard. There's no global admin: every staff account
// belongs to exactly one cooperative (users has a CHECK for it), and can only
// ever see and touch that cooperative's data.
export const requireCooperativeAdmin = [authenticate, cooperativeAdminOnly]

/**
 * The caller's cooperative — the tenant every query behind
 * requireCooperativeAdmin is scoped to (services take it as a required
 * `cooperativeId` and AND it into their WHERE).
 */
export function getCooperativeId(request: FastifyRequest): string {
  return (request.user as JwtPayload).cooperativeId!
}
