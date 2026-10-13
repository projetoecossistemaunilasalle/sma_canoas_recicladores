import type { FastifyReply, FastifyRequest } from "fastify"
import { AnnouncementService } from "./announcement.service"
import { getCooperativeId } from "../../middleware/auth.middleware"
import type { CreateAnnouncementInput, ListAnnouncementsQuery, UpdateAnnouncementInput } from "./announcement.schema"

const service = new AnnouncementService()

export class AnnouncementController {
  // Feed content visible to every authed role — not tenant-scoped data.
  async list(request: FastifyRequest<{ Querystring: ListAnnouncementsQuery }>, reply: FastifyReply) {
    return reply.send(await service.findAll(request.query))
  }

  async create(request: FastifyRequest<{ Body: CreateAnnouncementInput }>, reply: FastifyReply) {
    return reply.status(201).send(await service.create(getCooperativeId(request), request.body))
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: UpdateAnnouncementInput }>, reply: FastifyReply) {
    const existing = await service.findById(request.params.id)
    if (!existing) return reply.status(404).send({ message: "Announcement not found" })
    if (existing.cooperativeId !== getCooperativeId(request)) {
      return reply.status(403).send({ message: "Forbidden: can only edit your own cooperative's posts" })
    }
    const updated = await service.update(request.params.id, request.body)
    if (!updated) return reply.status(404).send({ message: "Announcement not found" })
    return reply.send(updated)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const existing = await service.findById(request.params.id)
    if (!existing) return reply.status(404).send({ message: "Announcement not found" })
    if (existing.cooperativeId !== getCooperativeId(request)) {
      return reply.status(403).send({ message: "Forbidden: can only delete your own cooperative's posts" })
    }
    await service.delete(request.params.id)
    return reply.status(204).send()
  }

  // Public (an <img> can't send a token) — the feed it belongs to is public
  // content anyway. A given id's bytes never change, so cache it for good.
  async image(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const image = await service.findImage(request.params.id)
    if (!image) return reply.status(404).send({ message: "Image not found" })
    return reply
      .header("Content-Type", image.mime)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(image.data)
  }
}
