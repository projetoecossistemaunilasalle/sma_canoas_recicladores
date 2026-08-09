import type { FastifyReply, FastifyRequest } from "fastify"
import { RouteService } from "./route.service"
import type { JwtPayload } from "../../lib/jwt"

const service = new RouteService()

function getCooperativeFilter(request: FastifyRequest): string | undefined {
  const user = request.user as JwtPayload
  if (user.role === "cooperative_admin" && user.cooperativeId) {
    return user.cooperativeId
  }
  return undefined
}

export class RouteController {
  // ==================== COLLECTION ROUTES ====================
  async list(request: FastifyRequest, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const list = await service.findAll(filter)
    return reply.send(list)
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const r = await service.findById(request.params.id, filter)
    if (!r) return reply.status(404).send({ message: "Route not found" })
    return reply.send(r)
  }

  async create(request: FastifyRequest<{ Body: { vehicleId: string; status?: string; totalDistanceKm?: number; totalDurationSeconds?: number; scheduledDate?: string } }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    let cooperativeId: string | undefined = undefined

    if (currentUser.role === "cooperative_admin" && currentUser.cooperativeId) {
      cooperativeId = currentUser.cooperativeId
    }

    const r = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(r)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: Partial<{ vehicleId: string; status: string; totalDistanceKm: number; totalDurationSeconds: number; scheduledDate: string; startedAt: string; completedAt: string }> }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const r = await service.update(request.params.id, request.body, filter)
    if (!r) return reply.status(404).send({ message: "Route not found" })
    return reply.send(r)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const r = await service.delete(request.params.id, filter)
    if (!r) return reply.status(404).send({ message: "Route not found" })
    return reply.status(204).send()
  }

  // ==================== ROUTE STREETS ====================
  async listStreets(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    // Verifica se a rota pertence à cooperativa do admin
    if (filter) {
      const route = await service.findById(request.params.id, filter)
      if (!route) return reply.status(404).send({ message: "Route not found" })
    }
    const streets = await service.findStreetsByRoute(request.params.id)
    return reply.send(streets)
  }

  async addStreet(request: FastifyRequest<{ Params: { id: string }; Body: { streetId: number; stopOrder: number; direction?: string; distanceFromPreviousKm?: number; durationFromPreviousSeconds?: number } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (filter) {
      const route = await service.findById(request.params.id, filter)
      if (!route) return reply.status(404).send({ message: "Route not found" })
    }
    const rs = await service.addStreetToRoute({ ...request.body, routeId: request.params.id })
    return reply.status(201).send(rs)
  }

  async updateStreet(request: FastifyRequest<{ Params: { routeId: string; streetId: string }; Body: Partial<{ streetId: number; stopOrder: number; direction: string; distanceFromPreviousKm: number; durationFromPreviousSeconds: number }> }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (filter) {
      const route = await service.findById(request.params.routeId, filter)
      if (!route) return reply.status(404).send({ message: "Route not found" })
    }
    const rs = await service.updateRouteStreet(request.params.streetId, request.body)
    if (!rs) return reply.status(404).send({ message: "Route street not found" })
    return reply.send(rs)
  }

  async removeStreet(request: FastifyRequest<{ Params: { routeId: string; streetId: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (filter) {
      const route = await service.findById(request.params.routeId, filter)
      if (!route) return reply.status(404).send({ message: "Route not found" })
    }
    const rs = await service.removeRouteStreet(request.params.streetId)
    if (!rs) return reply.status(404).send({ message: "Route street not found" })
    return reply.status(204).send()
  }
}
