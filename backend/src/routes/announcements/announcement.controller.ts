import type { FastifyReply, FastifyRequest } from "fastify"
import type { z } from "zod"
import { AnnouncementService } from "./announcement.service"
import type { JwtPayload } from "../../lib/jwt"
import { scopeCooperativeId } from "../../middleware/auth.middleware"
import type { createAnnouncementSchema, updateAnnouncementSchema, listAnnouncementsQuerySchema } from "./announcement.schema"

const service = new AnnouncementService()

export class AnnouncementController {
  // Feed content visible to every authed role — same documented exception
  // as CooperativeController.list()'s "user"/"cooperative_admin" branch;
  // not tenant-scoped data, so no getCooperativeFilter here.
  async list(request: FastifyRequest<{ Querystring: z.infer<typeof listAnnouncementsQuerySchema> }>, reply: FastifyReply) {
    const list = await service.findAll(request.query)
    return reply.send(list)
  }

  async create(request: FastifyRequest<{ Body: z.infer<typeof createAnnouncementSchema> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    // Safe non-null assertion: this route is requireCooperativeAdmin-only,
    // so currentUser.cooperativeId is always set.
    const cooperativeId = scopeCooperativeId(currentUser, undefined) as string
    const created = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(created)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateAnnouncementSchema> }>, reply: FastifyReply) {
    const existing = await service.findById(request.params.id)
    if (!existing) return reply.status(404).send({ message: "Announcement not found" })

    const user = request.user as JwtPayload
    if (user.role !== "admin" && existing.cooperativeId !== user.cooperativeId) {
      return reply.status(403).send({ message: "Forbidden: can only edit your own cooperative's posts" })
    }

    const updated = await service.update(request.params.id, request.body)
    if (!updated) return reply.status(404).send({ message: "Announcement not found" })
    return reply.send(updated)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const existing = await service.findById(request.params.id)
    if (!existing) return reply.status(404).send({ message: "Announcement not found" })

    const user = request.user as JwtPayload
    if (user.role !== "admin" && existing.cooperativeId !== user.cooperativeId) {
      return reply.status(403).send({ message: "Forbidden: can only delete your own cooperative's posts" })
    }

    await service.delete(request.params.id)
    return reply.status(204).send()
  }
}
