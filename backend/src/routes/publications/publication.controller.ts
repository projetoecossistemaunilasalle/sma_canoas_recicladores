import type { FastifyReply, FastifyRequest } from "fastify"

import { PublicationService } from "./publication.service"

import type { JwtPayload } from "../../lib/jwt"

const service = new PublicationService()

function getCooperativeFilter(request: FastifyRequest): string | undefined {
  const user = request.user as JwtPayload

  if (user?.role === "cooperative_admin" && user.cooperativeId) {
    return user.cooperativeId
  }

  return undefined
}

export class PublicationController {
  async list(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const list = await service.findAll()

    return reply.send(list)
  }

  async getById(
    request: FastifyRequest<{
      Params: { id: string }
    }>,
    reply: FastifyReply
  ) {
    const publication = await service.findById(
      request.params.id
    )

    if (!publication) {
      return reply.status(404).send({
        message: "Publication not found",
      })
    }

    return reply.send(publication)
  }

  async create(
    request: FastifyRequest<{
      Body: {
        title: string
        content: string
        imageUrl?: string | null
        cooperativeId?: string
      }
    }>,
    reply: FastifyReply
  ) {
    const currentUser = request.user as JwtPayload

    let cooperativeId = request.body.cooperativeId

    if (currentUser.role === "cooperative_admin") {
      cooperativeId = currentUser.cooperativeId ?? undefined
    }

    if (!cooperativeId) {
      return reply.status(400).send({
        message: "Cooperative is required",
      })
    }

    const publication = await service.create({
      ...request.body,
      cooperativeId,
    })

    return reply.status(201).send(publication)
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string }
      Body: {
        title?: string
        content?: string
        imageUrl?: string | null
      }
    }>,
    reply: FastifyReply
  ) {
    const filter = getCooperativeFilter(request)

    const publication = await service.update(
      request.params.id,
      request.body,
      filter
    )

    if (!publication) {
      return reply.status(404).send({
        message: "Publication not found",
      })
    }

    return reply.send(publication)
  }

  async updateStatus(
    request: FastifyRequest<{
      Params: { id: string }
      Body: {
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      }
    }>,
    reply: FastifyReply
  ) {
    const filter = getCooperativeFilter(request)

    const publication = await service.updateStatus(
      request.params.id,
      request.body.status,
      filter
    )

    if (!publication) {
      return reply.status(404).send({
        message: "Publication not found",
      })
    }

    return reply.send(publication)
  }

  async remove(
    request: FastifyRequest<{
      Params: { id: string }
    }>,
    reply: FastifyReply
  ) {
    const filter = getCooperativeFilter(request)

    const publication = await service.delete(
      request.params.id,
      filter
    )

    if (!publication) {
      return reply.status(404).send({
        message: "Publication not found",
      })
    }

    return reply.status(204).send()
  }
}