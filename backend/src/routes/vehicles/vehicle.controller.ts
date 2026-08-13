import type { FastifyReply, FastifyRequest } from "fastify"
import { VehicleService } from "./vehicle.service"
import type { JwtPayload } from "../../lib/jwt"

const service = new VehicleService()

function getCooperativeFilter(request: FastifyRequest): string | undefined {
  const user = request.user as JwtPayload
  if (user.role === "cooperative_admin" && user.cooperativeId) {
    return user.cooperativeId
  }
  return undefined
}

export class VehicleController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const list = await service.findAll(filter)
    return reply.send(list)
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const v = await service.findById(request.params.id, filter)
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.send(v)
  }

  async create(request: FastifyRequest<{ Body: { plate?: string; model?: string; color?: string; cooperativeId?: string; active?: boolean } }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    let cooperativeId = request.body.cooperativeId
    if (currentUser.role === "cooperative_admin") {
      cooperativeId = currentUser.cooperativeId ?? undefined
    }
    const v = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(v)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: Partial<{ plate?: string; model?: string; color?: string; cooperativeId?: string; active?: boolean }> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const filter = getCooperativeFilter(request)
    if (currentUser.role === "cooperative_admin" && request.body.cooperativeId) {
      delete request.body.cooperativeId
    }
    const v = await service.update(request.params.id, request.body, filter)
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.send(v)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const v = await service.delete(request.params.id, filter)
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.status(204).send()
  }

  async getPositions(request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>, reply: FastifyReply) {
    const limit = request.query.limit ? parseInt(request.query.limit) : 50
    const positions = await service.findPositions(request.params.id, limit)
    return reply.send(positions)
  }

  async getLatestPosition(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const pos = await service.findLatestPosition(request.params.id)
    if (!pos) return reply.status(404).send({ message: "No position found" })
    return reply.send(pos)
  }

  async createPosition(request: FastifyRequest<{ Params: { id: string }; Body: { location: string } }>, reply: FastifyReply) {
    const pos = await service.createPosition(request.params.id, request.body)
    return reply.status(201).send(pos)
  }

  async getEta(request: FastifyRequest<{ Params: { id: string }; Querystring: { lat: number; lng: number } }>, reply: FastifyReply) {
    const eta = await service.getEta(request.params.id, request.query.lat, request.query.lng)
    if (!eta) return reply.status(404).send({ message: "Vehicle not found or has no positions" })
    return reply.send(eta)
  }
}
