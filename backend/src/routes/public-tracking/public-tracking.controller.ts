import type { FastifyReply, FastifyRequest } from "fastify"
import { PublicTrackingService } from "./public-tracking.service"

const service = new PublicTrackingService()

export class PublicTrackingController {
  async geocode(request: FastifyRequest<{ Querystring: { q: string } }>, reply: FastifyReply) {
    const results = await service.geocode(request.query.q)
    return reply.send(results)
  }

  async collectionCheck(request: FastifyRequest<{ Querystring: { lat: number; lng: number } }>, reply: FastifyReply) {
    const result = await service.checkAddress(request.query.lat, request.query.lng)
    return reply.send(result)
  }
}
