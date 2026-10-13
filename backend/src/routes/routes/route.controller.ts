import type { FastifyReply, FastifyRequest } from "fastify"
import { RouteService, RoutePlanError } from "./route.service"
import { getCooperativeId } from "../../middleware/auth.middleware"
import type { RouteInput } from "./route.schema"

const service = new RouteService()

async function saveRoute(request: FastifyRequest<{ Body: RouteInput }>, reply: FastifyReply, id?: string) {
  try {
    const result = await service.save(id, request.body, getCooperativeId(request))
    if (result.error === "not_found") return reply.status(404).send({ message: "Route not found" })
    if (result.error === "vehicle_not_found") {
      return reply.status(400).send({ message: "Veículo não encontrado entre os da sua cooperativa." })
    }
    return reply.status(id ? 200 : 201).send(result.route)
  } catch (err) {
    if (err instanceof RoutePlanError) return reply.status(400).send({ message: err.message })
    throw err
  }
}

export class RouteController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await service.findAll(getCooperativeId(request)))
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const r = await service.findById(request.params.id, getCooperativeId(request))
    if (!r) return reply.status(404).send({ message: "Route not found" })
    return reply.send(r)
  }

  async create(request: FastifyRequest<{ Body: RouteInput }>, reply: FastifyReply) {
    return saveRoute(request, reply)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: RouteInput }>, reply: FastifyReply) {
    return saveRoute(request, reply, request.params.id)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const r = await service.delete(request.params.id, getCooperativeId(request))
    if (!r) return reply.status(404).send({ message: "Route not found" })
    return reply.status(204).send()
  }

  async listStops(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    if (!(await service.findById(request.params.id, getCooperativeId(request)))) {
      return reply.status(404).send({ message: "Route not found" })
    }
    return reply.send(await service.findStopStreets(request.params.id))
  }

  async preview(request: FastifyRequest<{ Body: { streetIds: number[] } }>, reply: FastifyReply) {
    try {
      return reply.send(await service.preview(request.body.streetIds))
    } catch (err) {
      if (err instanceof RoutePlanError) return reply.status(400).send({ message: err.message })
      throw err
    }
  }
}
