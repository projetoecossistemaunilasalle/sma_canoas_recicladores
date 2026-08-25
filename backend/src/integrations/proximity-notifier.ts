import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "../db"
import { users, pushSubscriptions } from "../db/schema"
import { UserService } from "../routes/users/user.service"
import { PublicTrackingService } from "../routes/public-tracking/public-tracking.service"
import { sendPushNotification } from "../lib/web-push"

const userService = new UserService()
const trackingService = new PublicTrackingService()

const CHECK_INTERVAL_MS = 60_000
const PROXIMITY_THRESHOLD_SECONDS = 5 * 60

// userId -> "YYYY-MM-DD" of the last day we already pushed a notification
// for, so a citizen gets exactly one push per collection occurrence instead
// of one every 60s while the truck stays under the 5-minute threshold.
const lastNotifiedDate = new Map<string, string>()

async function checkOnce() {
  const candidates = await db
    .select()
    .from(users)
    .where(and(eq(users.notifyProximity, true), isNotNull(users.addressLat), isNotNull(users.addressLng)))

  for (const citizen of candidates) {
    if (citizen.addressLat == null || citizen.addressLng == null) continue

    const result = await trackingService.checkAddress(citizen.addressLat, citizen.addressLng)
    if (result.status !== "arriving" || result.etaSeconds > PROXIMITY_THRESHOLD_SECONDS) continue

    const todayKey = new Date().toISOString().slice(0, 10)
    if (lastNotifiedDate.get(citizen.id) === todayKey) continue

    const subscriptions = await userService.findPushSubscriptions(citizen.id)
    for (const sub of subscriptions) {
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

    if (subscriptions.length > 0) lastNotifiedDate.set(citizen.id, todayKey)
  }
}

export function startProximityNotifier() {
  setInterval(() => {
    checkOnce().catch((err) => console.error("Proximity notifier failed:", err))
  }, CHECK_INTERVAL_MS)
}
