import type { FastifyReply, FastifyRequest } from "fastify"
import type { z } from "zod"
import { CooperativeService } from "./cooperative.service"
import { getCooperativeId } from "../../middleware/auth.middleware"
import type { updateCooperativeSchema } from "./cooperative.schema"

const service = new CooperativeService()

export class CooperativeController {
  // The active-cooperative directory is routine info every role may see —
  // citizens' "find a cooperative" screen, and the "lend this vehicle to..."
  // picker. Creating, deactivating or removing cooperatives is done in the DB.
  async list(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await service.findActive())
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const coop = request.params.id === getCooperativeId(request) ? await service.findById(request.params.id) : null
    if (!coop) return reply.status(404).send({ message: "Cooperative not found" })
    return reply.send(coop)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateCooperativeSchema> }>, reply: FastifyReply) {
    if (request.params.id !== getCooperativeId(request)) {
      return reply.status(403).send({ message: "Forbidden: can only edit your own cooperative" })
    }
    const coop = await service.update(request.params.id, request.body)
    if (!coop) return reply.status(404).send({ message: "Cooperative not found" })
    return reply.send(coop)
  }
}
