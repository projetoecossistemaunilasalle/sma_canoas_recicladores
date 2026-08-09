import type { FastifyReply, FastifyRequest } from "fastify"
import { UserService } from "./user.service"
import { verifyPassword } from "../../lib/password"
import { signToken } from "../../lib/jwt"
import type { JwtPayload } from "../../lib/jwt"

const service = new UserService()

function getCooperativeFilter(request: FastifyRequest): string | undefined {
  const user = request.user as JwtPayload
  if (user.role === "cooperative_admin" && user.cooperativeId) {
    return user.cooperativeId
  }
  return undefined
}

export class UserController {
  async login(request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) {
    const { email, password } = request.body
    const user = await service.findByEmail(email)
    if (!user || !user.active) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    const valid = await verifyPassword(user.password, password)
    if (!valid) {
      return reply.status(401).send({ message: "Invalid credentials" })
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      cooperativeId: user.cooperativeId,
    })

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        cooperativeId: user.cooperativeId,
        address: user.address,
      },
    })
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const list = await service.findAll(filter)
    return reply.send(list)
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const user = await service.findById(request.params.id, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  async create(request: FastifyRequest<{ Body: { name: string; email: string; password: string; role?: string; cooperativeId?: string; address?: string } }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    let cooperativeId = request.body.cooperativeId

    if (currentUser.role === "cooperative_admin") {
      cooperativeId = currentUser.cooperativeId ?? undefined
    }

    const user = await service.create({ ...request.body, cooperativeId })
    return reply.status(201).send(user)
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: Partial<{ name: string; email: string; password: string; role: string; cooperativeId: string; address: string; active: boolean }> }>, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const filter = getCooperativeFilter(request)

    if (currentUser.role === "cooperative_admin" && request.body.role) {
      delete request.body.role
    }
    if (currentUser.role === "cooperative_admin" && request.body.cooperativeId) {
      delete request.body.cooperativeId
    }

    const user = await service.update(request.params.id, request.body, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const filter = getCooperativeFilter(request)
    const user = await service.delete(request.params.id, filter)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.status(204).send()
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.user as JwtPayload
    const user = await service.findById(currentUser.userId)
    if (!user) return reply.status(404).send({ message: "User not found" })
    return reply.send(user)
  }
}
