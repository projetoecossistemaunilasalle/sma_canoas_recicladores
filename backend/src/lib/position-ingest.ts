import { VehicleService } from "../routes/vehicles/vehicle.service"
import * as wsHub from "./ws-hub"

const vehicleService = new VehicleService()

// Shared by POST /vehicles/:id/positions and the Multiportal sync job —
// inserting a position always broadcasts it too, so there's exactly one
// place that can get that pairing wrong.
export async function recordAndBroadcastPosition(vehicleId: string, lat: number, lng: number, recordedAt?: Date) {
  const pos = await vehicleService.createPosition(vehicleId, lat, lng, recordedAt)
  wsHub.broadcastPosition(vehicleId, { lat: pos.lat, lng: pos.lng, recordedAt: pos.recordedAt.toISOString() })
  return pos
}
