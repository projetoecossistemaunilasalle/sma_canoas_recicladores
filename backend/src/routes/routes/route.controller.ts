import type { FastifyReply, FastifyRequest } from "fastify"
import type { z } from "zod"
import { RouteService } from "./route.service"
import { StreetService } from "../streets/street.service"
import type { JwtPayload } from "../../lib/jwt"
import { getCooperativeFilter, scopeCooperativeId } from "../../middleware/auth.middleware"
import type { createCollectionRouteSchema, updateCollectionRouteSchema } from "./route.schema"

const service = new RouteService()
const streetService = new StreetService()

// The "does this route belong to the caller's cooperative" check every
// route-streets handler below repeats before touching a :routeId — sends
// the 404 itself and reports whether the caller should stop.
async function assertRouteAccessible(routeId: string, filter: string | undefined, reply: FastifyReply): Promise<boolean> {
  if (!filter) return true
  const route = await service.findById(routeId, filter)
  if (!route) {
    reply.status(404).send({ message: "Route not found" })
    return false
  }
  return true
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

  async create(request: FastifyRequest<{ Body: z.infer<typeof createCollectionRouteSchema> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const cooperativeId = scopeCooperativeId(currentUser, undefined)
    const r = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(r)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateCollectionRouteSchema> }>, reply: FastifyReply) {
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
    if (!(await assertRouteAccessible(request.params.id, filter, reply))) return
    const streets = await service.findStreetsByRoute(request.params.id)
    return reply.send(streets)
  }

  async listStops(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (!(await assertRouteAccessible(request.params.id, filter, reply))) return
    const stops = await service.findStopStreets(request.params.id)
    return reply.send(stops)
  }

  async addStreet(request: FastifyRequest<{ Params: { id: string }; Body: { streetId: number; stopOrder: number; direction?: string; distanceFromPreviousKm?: number; durationFromPreviousSeconds?: number } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (!(await assertRouteAccessible(request.params.id, filter, reply))) return
    const rs = await service.addStreetToRoute({ ...request.body, routeId: request.params.id })
    return reply.status(201).send(rs)
  }

  async updateStreet(request: FastifyRequest<{ Params: { routeId: string; streetId: string }; Body: Partial<{ streetId: number; stopOrder: number; direction: string; distanceFromPreviousKm: number; durationFromPreviousSeconds: number }> }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (!(await assertRouteAccessible(request.params.routeId, filter, reply))) return
    const rs = await service.updateRouteStreet(request.params.streetId, request.body)
    if (!rs) return reply.status(404).send({ message: "Route street not found" })
    return reply.send(rs)
  }

  async removeStreet(request: FastifyRequest<{ Params: { routeId: string; streetId: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (!(await assertRouteAccessible(request.params.routeId, filter, reply))) return
    const rs = await service.removeRouteStreet(request.params.streetId)
    if (!rs) return reply.status(404).send({ message: "Route street not found" })
    return reply.status(204).send()
  }

  async plan(request: FastifyRequest<{ Params: { id: string }; Body: { streetIds: number[] } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    if (!(await assertRouteAccessible(request.params.id, filter, reply))) return
    try {
      const streets = await service.planRoute(request.params.id, request.body.streetIds)
      return reply.send(streets)
    } catch (err) {
      return reply.status(400).send({ message: err instanceof Error ? err.message : "Could not plan route" })
    }
  }

  async preview(request: FastifyRequest<{ Body: { streetIds: number[] } }>, reply: FastifyReply) {
    try {
      const segments = await service.computePath(request.body.streetIds)
      const streetRows = await streetService.findByIds(segments.map((s) => s.streetId))
      const streetsById = new Map(streetRows.map((s) => [s.id, s]))
      const result = segments.map((seg) => ({
        streetId: seg.streetId,
        isStop: seg.isStop,
        name: streetsById.get(seg.streetId)?.name ?? null,
        geom: streetsById.get(seg.streetId)?.geom ?? "",
      }))
      return reply.send(result)
    } catch (err) {
      return reply.status(400).send({ message: err instanceof Error ? err.message : "Could not preview route" })
    }
  }
}
