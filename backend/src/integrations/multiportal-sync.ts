import { VehicleService } from "../routes/vehicles/vehicle.service"
import { recordAndBroadcastPosition } from "../lib/position-ingest"
import { getLastPositions, startTokenRefreshLoop } from "./multiportal-client"

const vehicleService = new VehicleService()

// /posicoes/ultimaPosicao is documented as having no rate limit for
// recurring calls, but there's no reason to poll faster than the public
// map's own live-tracking needs.
const POLL_INTERVAL_MS = 5_000

// Plates only ever come in already normalized from the DB (see
// docker/postgres/initdb/003-vehicles.sql), but Multiportal's own data can
// contain hyphens or mixed case, so both sides are normalized before matching.
function normalizePlate(plate: string): string {
  return plate.replace(/-/g, "").toUpperCase().trim()
}

// Keyed by *our* normalized plate rather than Multiportal's own vehicle id —
// Multiportal can list the same plate under more than one vehicle id (e.g. a
// re-registered tracker), which would defeat an id-keyed dedup and produce
// duplicate position rows for the one vehicle we actually match on plate.
const lastSeenFix = new Map<string, number>()

async function syncOnce() {
  const vehicles = await getLastPositions()

  for (const mv of vehicles) {
    const plate = normalizePlate(mv.placa ?? "")
    if (!plate) continue

    const position = mv.dispositivos?.flatMap((d) => d.posicoes ?? [])[0]
    if (!position || typeof position.latitude !== "number" || typeof position.longitude !== "number") continue
    if (lastSeenFix.get(plate) === position.dataGPS) continue

    const vehicle = await vehicleService.findByPlate(plate)
    if (!vehicle) continue // not a vehicle we track — skip silently

    await recordAndBroadcastPosition(
      vehicle.id,
      `POINT(${position.longitude} ${position.latitude})`,
      new Date(position.dataGPS)
    )
    lastSeenFix.set(plate, position.dataGPS)
  }
}

export function startMultiportalSync() {
  if (!process.env.MULTIPORTAL_USERNAME) {
    console.log("Multiportal sync disabled (MULTIPORTAL_USERNAME not set)")
    return
  }

  startTokenRefreshLoop()

  syncOnce().catch((err) => console.error("Multiportal sync failed:", err))
  setInterval(() => {
    syncOnce().catch((err) => console.error("Multiportal sync failed:", err))
  }, POLL_INTERVAL_MS)
}
