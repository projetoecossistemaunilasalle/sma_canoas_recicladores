import type { FastifyReply, FastifyRequest } from "fastify"
import { StreetService } from "./street.service"

const service = new StreetService()

export class StreetController {
  async list(
    request: FastifyRequest<{ Querystring: { search?: string; limit: number } }>,
    reply: FastifyReply
  ) {
    const streets = await service.search(request.query.search, request.query.limit)
    return reply.send(streets)
  }

  async getById(request: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
    const street = await service.findById(request.params.id)
    if (!street) return reply.status(404).send({ message: "Street not found" })
    return reply.send(street)
  }

  async nearest(request: FastifyRequest<{ Querystring: { lat: number; lng: number } }>, reply: FastifyReply) {
    const street = await service.findNearest(request.query.lat, request.query.lng)
    if (!street) return reply.status(404).send({ message: "No street found" })
    return reply.send(street)
  }
}
