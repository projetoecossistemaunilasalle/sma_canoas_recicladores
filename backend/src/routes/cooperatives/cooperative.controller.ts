import type { FastifyReply, FastifyRequest } from "fastify"
import { CooperativeService } from "./cooperative.service"
import type { JwtPayload } from "../../lib/jwt"

const service = new CooperativeService()

export class CooperativeController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JwtPayload
    if (user.role === "admin") {
      const coops = await service.findAll()
      return reply.send(coops)
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

  async create(request: FastifyRequest<{ Body: { name: string; cnpj?: string; phone?: string; address?: string; instagram?: string; website?: string } }>, reply: FastifyReply) {
    const coop = await service.create(request.body)
    return reply.status(201).send(coop)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: Partial<{ name: string; cnpj?: string; phone?: string; address?: string; instagram?: string; website?: string }> }>, reply: FastifyReply) {
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
