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

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ message: "Unauthorized" })
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ message: "Forbidden: insufficient permissions" })
    }
  }
}

// The exact preHandler combinations every resource's routes.ts reaches for —
// named here once instead of each route file re-typing the same role list.
export const requireAuth = [authenticate]
export const requireStaff = [authenticate, requireRole("admin", "cooperative_admin")]
export const requireAnyAuthed = [authenticate, requireRole("admin", "cooperative_admin", "user")]
export const requireAdmin = [authenticate, requireRole("admin")]
export const requireCooperativeAdmin = [authenticate, requireRole("cooperative_admin")]

// A cooperative_admin only ever sees/touches its own cooperative's rows;
// "admin" sees everything (undefined = no filter). Every tenant-scoped
// controller (users, vehicles, routes) uses this same rule — see CLAUDE.md's
// "Auth & multi-tenancy" section for the filterCooperativeId pattern this feeds.
export function getCooperativeFilter(request: FastifyRequest): string | undefined {
  const user = request.user as JwtPayload
  if (user.role === "cooperative_admin" && user.cooperativeId) {
    return user.cooperativeId
  }
  return undefined
}

// A cooperative_admin's writes are always pinned to its own cooperative,
// regardless of what the request body asked for; "admin" (and any role
// without a cooperativeId) keeps whatever the caller requested.
export function scopeCooperativeId(currentUser: JwtPayload, requestedCooperativeId: string | undefined): string | undefined {
  if (currentUser.role === "cooperative_admin") {
    return currentUser.cooperativeId ?? undefined
  }
  return requestedCooperativeId
}
