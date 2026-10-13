import type { FastifyReply, FastifyRequest } from "fastify"
import { PublicTrackingService } from "./public-tracking.service"
import type { HouseSide } from "../../lib/street-side"

const service = new PublicTrackingService()

export class PublicTrackingController {
  async geocode(request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) {
    const results = await service.geocode(request.query.q)
    return reply.send(results)
  }

  async addressStreet(
    request: FastifyRequest<{ Querystring: { lat: number; lng: number; road?: string } }>,
    reply: FastifyReply
  ) {
    const street = await service.resolveAddressStreet(request.query.lat, request.query.lng, request.query.road)
    if (!street) return reply.status(404).send({ message: "Nenhuma rua perto desse ponto" })
    return reply.send(street)
  }

  async collectionCheck(
    request: FastifyRequest<{ Querystring: { lat: number; lng: number; streetId: number; side: HouseSide } }>,
    reply: FastifyReply
  ) {
    const result = await service.checkAddress(request.query)
    return reply.send(result)
  }

  async cooperatives(_request: FastifyRequest, reply: FastifyReply) {
    const results = await service.listActiveCooperatives()
    return reply.send(results)
  }
}
