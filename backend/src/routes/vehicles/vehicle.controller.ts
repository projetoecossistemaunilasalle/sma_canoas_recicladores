import type { FastifyReply, FastifyRequest } from "fastify"
import { VehicleService, type LoanResult } from "./vehicle.service"
import { recordAndBroadcastPosition } from "../../lib/position-ingest"
import { getCooperativeId } from "../../middleware/auth.middleware"
import type { VehicleInput } from "./vehicle.schema"

const service = new VehicleService()

const LOAN_ERRORS: Record<NonNullable<LoanResult["error"]>, { status: number; message: string }> = {
  not_found: { status: 404, message: "Vehicle not found" },
  same_cooperative: { status: 400, message: "O veículo já pertence a essa cooperativa." },
  already_loaned: {
    status: 400,
    message: "Este veículo já está emprestado. Encerre o empréstimo atual antes de emprestá-lo para outra cooperativa.",
  },
  not_loaned: { status: 400, message: "Este veículo não está emprestado." },
  route_conflict: { status: 409, message: "Este veículo está vinculado a rotas de coleta." },
}

function sendLoanResult(result: LoanResult, reply: FastifyReply) {
  if (!result.error) return reply.send(result.vehicle)
  const { status, message } = LOAN_ERRORS[result.error]
  return reply.status(status).send(result.routes ? { message, routes: result.routes } : { message })
}

export class VehicleController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await service.findAll(getCooperativeId(request)))
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const v = await service.findById(request.params.id, getCooperativeId(request))
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.send(v)
  }

  // Always owned by the caller's cooperative — ownership only changes hands
  // through a loan, never through the vehicle form.
  async create(request: FastifyRequest<{ Body: VehicleInput }>, reply: FastifyReply) {
    return reply.status(201).send(await service.create({ ...request.body, cooperativeId: getCooperativeId(request) }))
  }

  async update(request: FastifyRequest<{ Params: { id: string }; Body: VehicleInput }>, reply: FastifyReply) {
    const v = await service.update(request.params.id, request.body, getCooperativeId(request))
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.send(v)
  }

  async remove(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const v = await service.delete(request.params.id, getCooperativeId(request))
    if (!v) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.status(204).send()
  }

  // Manual GPS feed (testing/simulation; real trucks come in through the
  // Multiportal sync) — only for a vehicle the caller drives.
  async createPosition(request: FastifyRequest<{ Params: { id: string }; Body: { lat: number; lng: number } }>, reply: FastifyReply) {
    const vehicle = await service.findVisible(request.params.id, getCooperativeId(request))
    if (!vehicle) return reply.status(404).send({ message: "Vehicle not found" })
    return reply.status(201).send(await recordAndBroadcastPosition(vehicle.id, request.body.lat, request.body.lng))
  }

  async loan(request: FastifyRequest<{ Params: { id: string }; Body: { cooperativeId: string; confirmUnlink?: boolean } }>, reply: FastifyReply) {
    const { cooperativeId, confirmUnlink = false } = request.body
    return sendLoanResult(await service.setLoan(request.params.id, cooperativeId, confirmUnlink, getCooperativeId(request)), reply)
  }

  async endLoan(request: FastifyRequest<{ Params: { id: string }; Body: { confirmUnlink?: boolean } }>, reply: FastifyReply) {
    const { confirmUnlink = false } = request.body
    return sendLoanResult(await service.setLoan(request.params.id, null, confirmUnlink, getCooperativeId(request)), reply)
  }
}
