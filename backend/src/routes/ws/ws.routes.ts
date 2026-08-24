import type { FastifyPluginAsync } from "fastify"
import * as wsHub from "../../lib/ws-hub"

// Public, unauthenticated tracking channel: a client connects, sends
// {"type":"subscribe","vehicleId":"<uuid>"}, and from then on receives
// {"type":"position",vehicleId,lat,lng,recordedAt} messages whenever that
// vehicle gets a new position via POST /vehicles/:id/positions.
export const wsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/ws/tracking", { websocket: true }, (socket) => {
    let subscribedVehicleId: string | null = null

    socket.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg?.type === "subscribe" && typeof msg.vehicleId === "string") {
          if (subscribedVehicleId) wsHub.unsubscribe(subscribedVehicleId, socket)
          subscribedVehicleId = msg.vehicleId
          wsHub.subscribe(msg.vehicleId, socket)
        }
      } catch {
        // ignore malformed messages
      }
    })

    socket.on("close", () => {
      if (subscribedVehicleId) wsHub.unsubscribe(subscribedVehicleId, socket)
    })
  })
}
