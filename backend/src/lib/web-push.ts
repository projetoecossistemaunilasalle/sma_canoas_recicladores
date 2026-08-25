import webpush from "web-push"

const publicKey = process.env.VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY
const contact = process.env.VAPID_CONTACT_EMAIL ?? "mailto:contato@example.com"

const configured = Boolean(publicKey && privateKey)
if (configured) {
  webpush.setVapidDetails(contact, publicKey as string, privateKey as string)
}

export interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPushNotification(subscription: WebPushSubscription, payload: object) {
  if (!configured) return
  await webpush.sendNotification(subscription, JSON.stringify(payload))
}
