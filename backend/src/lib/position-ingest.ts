import { VehicleService } from "../routes/vehicles/vehicle.service"
import { parseWktPoint } from "./geo"
import * as wsHub from "./ws-hub"

const vehicleService = new VehicleService()

// Shared by the authenticated POST /vehicles/:id/positions endpoint and the
// Multiportal sync job — inserting a position always broadcasts it too, so
// there's exactly one place that can get that pairing wrong.
export async function recordAndBroadcastPosition(vehicleId: string, location: string, recordedAt?: Date) {
  const pos = await vehicleService.createPosition(vehicleId, recordedAt ? { location, recordedAt } : { location })

  const point = parseWktPoint(pos.location)
  if (point) {
    wsHub.broadcastPosition(vehicleId, {
      lat: point.lat,
      lng: point.lng,
      recordedAt: pos.recordedAt.toISOString(),
    })
  }

  return pos
}
