import type { FastifyReply, FastifyRequest } from "fastify"

export function requireCooperativeAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  const user = request.user
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized" })
  }

  if (user.role === "cooperative_admin" && !user.cooperativeId) {
    return reply.status(403).send({ message: "Forbidden: admin without cooperative" })
  }

  done()
}
