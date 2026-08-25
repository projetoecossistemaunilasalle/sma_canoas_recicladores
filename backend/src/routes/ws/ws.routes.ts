import type { FastifyPluginAsync } from "fastify"
import * as wsHub from "../../lib/ws-hub"

// Public, unauthenticated tracking channel: a client connects, sends
// {"type":"subscribe","vehicleId":"<uuid>"} (repeatable — one connection can
// track many vehicles at once, e.g. a whole fleet), and from then on
// receives {"type":"position",vehicleId,lat,lng,recordedAt} messages
// whenever any subscribed vehicle gets a new position via
// POST /vehicles/:id/positions. Send {"type":"unsubscribe","vehicleId"} to
// stop tracking one without closing the connection.
export const wsRoutes: FastifyPluginAsync = async (server) => {
  server.get("/ws/tracking", { websocket: true }, (socket) => {
    const subscribedVehicleIds = new Set<string>()

    socket.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg?.type === "subscribe" && typeof msg.vehicleId === "string") {
          subscribedVehicleIds.add(msg.vehicleId)
          wsHub.subscribe(msg.vehicleId, socket)
        } else if (msg?.type === "unsubscribe" && typeof msg.vehicleId === "string") {
          subscribedVehicleIds.delete(msg.vehicleId)
          wsHub.unsubscribe(msg.vehicleId, socket)
        }
      } catch {
        // ignore malformed messages
      }
    })

    socket.on("close", () => {
      for (const vehicleId of subscribedVehicleIds) wsHub.unsubscribe(vehicleId, socket)
    })
  })
}
