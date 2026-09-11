import type { FastifyReply, FastifyRequest } from "fastify"
import type { z } from "zod"
import { CooperativeService } from "./cooperative.service"
import type { JwtPayload } from "../../lib/jwt"
import type { createCooperativeSchema, updateCooperativeSchema } from "./cooperative.schema"

const service = new CooperativeService()

export class CooperativeController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JwtPayload
    if (user.role === "admin") {
      return reply.send(await service.findAll())
    }
    if (user.role === "user" || user.role === "cooperative_admin") {
      const coops = await service.findAll()
      return reply.send(coops.filter((c) => c.active))
    }
    if (!user.cooperativeId) return reply.send([])
    const coop = await service.findById(user.cooperativeId)
    return reply.send(coop ? [coop] : [])
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const user = request.user as JwtPayload
    if (user.role !== "admin" && request.params.id !== user.cooperativeId) {
      return reply.status(404).send({ message: "Cooperative not found" })
    }
    const coop = await service.findById(request.params.id)
    if (!coop) return reply.status(404).send({ message: "Cooperative not found" })
    return reply.send(coop)
  }

  async create(request: FastifyRequest<{ Body: z.infer<typeof createCooperativeSchema> }>, reply: FastifyReply) {
    const coop = await service.create(request.body)
    return reply.status(201).send(coop)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateCooperativeSchema> }>, reply: FastifyReply) {
    const user = request.user as JwtPayload
    if (user.role !== "admin" && request.params.id !== user.cooperativeId) {
      return reply.status(403).send({ message: "Forbidden: can only edit your own cooperative" })
    }
    const coop = await service.update(request.params.id, request.body)
    if (!coop) return reply.status(404).send({ message: "Cooperative not found" })
    return reply.send(coop)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const coop = await service.delete(request.params.id)
    if (!coop) return reply.status(404).send({ message: "Cooperative not found" })
    return reply.status(204).send()
  }
}
