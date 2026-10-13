import { eq, sql } from "drizzle-orm"
import { db } from "../db"
import { users, pushSubscriptions } from "../db/schema"
import { UserService } from "../routes/users/user.service"
import { PublicTrackingService } from "../routes/public-tracking/public-tracking.service"
import { getTodayContext } from "../lib/schedule"
import { sendPushNotification } from "../lib/web-push"
import type { HouseSide } from "../lib/street-side"

const userService = new UserService()
const trackingService = new PublicTrackingService()

const CHECK_INTERVAL_MS = 60_000
const PROXIMITY_THRESHOLD_SECONDS = 5 * 60

interface CandidateRow {
  [key: string]: unknown
  id: string
  lat: number
  lng: number
  street_id: number
  side: HouseSide
}

// Only citizens worth a full ETA check: subscribed to push, not yet notified
// today, and whose house sits on a stop (their side, their stretch) of a
// route that runs today and has already started. Everyone else would just
// come back "not arriving" — no need to run checkAddress for them every minute.
async function findCandidates() {
  const { today } = await getTodayContext()
  const result = await db.execute<CandidateRow>(sql`
    SELECT DISTINCT u.id, u.address_lat AS lat, u.address_lng AS lng, u.address_street_id AS street_id, u.address_side AS side
    FROM users u
    JOIN route_streets rs ON rs.street_id = u.address_street_id AND rs.is_stop AND rs.side IN ('both', u.address_side)
    JOIN streets s ON s.id = rs.street_id
    JOIN collection_routes cr ON cr.id = rs.route_id
    WHERE u.proximity_notified_on IS DISTINCT FROM CURRENT_DATE
      AND u.address_lat IS NOT NULL AND u.address_lng IS NOT NULL AND u.address_side IS NOT NULL
      AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = u.id)
      AND ${today} = ANY(cr.days_of_week)
      AND cr.start_time <= LOCALTIME
      AND ST_LineLocatePoint(s.geom, ST_SetSRID(ST_MakePoint(u.address_lng, u.address_lat), 4326))
          BETWEEN rs.start_fraction AND rs.end_fraction
  `)
  return result.rows
}

async function checkOnce() {
  for (const citizen of await findCandidates()) {
    const result = await trackingService.checkAddress({
      lat: citizen.lat,
      lng: citizen.lng,
      streetId: citizen.street_id,
      side: citizen.side,
    })
    if (result.status !== "arriving" || result.etaSeconds > PROXIMITY_THRESHOLD_SECONDS) continue

    for (const sub of await userService.findPushSubscriptions(citizen.id)) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: "O caminhão está chegando!",
            body: `Previsão: ${result.etaText} para ${result.street ?? "sua rua"}.`,
          }
        )
      } catch {
        // Expired/invalid subscription (410 Gone, etc.) — stop trying it.
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
      }
    }

    // One push per collection day — stored, so a restart doesn't repeat it.
    await db.update(users).set({ proximityNotifiedOn: sql`CURRENT_DATE` }).where(eq(users.id, citizen.id))
  }
}

export function startProximityNotifier() {
  setInterval(() => {
    checkOnce().catch((err) => console.error("Proximity notifier failed:", err))
  }, CHECK_INTERVAL_MS)
}
