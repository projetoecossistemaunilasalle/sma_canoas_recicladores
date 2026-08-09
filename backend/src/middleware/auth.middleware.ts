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
