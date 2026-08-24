// In-memory hub broadcasting raw vehicle positions to public tracking
// subscribers. Deliberately carries only {lat,lng,recordedAt} — not a
// per-citizen status (chegando/passou/etc) — because each subscriber may be
// watching a different address, so that computation belongs client-side
// (via a light poll of /public/collection-check), not here.
interface Broadcastable {
  readyState: number
  send(data: string): void
}

const WS_OPEN_STATE = 1

const subscribersByVehicleId = new Map<string, Set<Broadcastable>>()

export function subscribe(vehicleId: string, socket: Broadcastable) {
  let set = subscribersByVehicleId.get(vehicleId)
  if (!set) {
    set = new Set()
    subscribersByVehicleId.set(vehicleId, set)
  }
  set.add(socket)
}

export function unsubscribe(vehicleId: string, socket: Broadcastable) {
  const set = subscribersByVehicleId.get(vehicleId)
  if (!set) return
  set.delete(socket)
  if (set.size === 0) subscribersByVehicleId.delete(vehicleId)
}

export function broadcastPosition(vehicleId: string, payload: { lat: number; lng: number; recordedAt: string }) {
  const set = subscribersByVehicleId.get(vehicleId)
  if (!set || set.size === 0) return
  const message = JSON.stringify({ type: "position", vehicleId, ...payload })
  for (const socket of set) {
    if (socket.readyState === WS_OPEN_STATE) socket.send(message)
  }
}
