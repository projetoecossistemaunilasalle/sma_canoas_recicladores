"use client";

import { useState } from "react";
import { savePushSubscriptionAction, deletePushSubscriptionsAction } from "@/app/citizen/actions";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Web Push subscribe() expects the VAPID public key as a raw Uint8Array, not
// the base64url string the server hands out.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { ok } = await savePushSubscriptionAction({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return ok;
}

async function unsubscribeFromPush(): Promise<boolean> {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
  const { ok } = await deletePushSubscriptionsAction();
  return ok;
}

/**
 * The "warn me when the truck is close" switch (profile and Minha Coleta).
 * It's on while the account has a push subscription — subscribing this
 * browser turns it on, and turning it off drops every device's.
 */
export function useProximityNotifications(initiallyOn: boolean) {
  const [on, setOn] = useState(initiallyOn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setPending(true);
    try {
      if (on) {
        if (await unsubscribeFromPush()) setOn(false);
        else setError("Não foi possível desligar os avisos. Tente de novo.");
      } else if (await subscribeToPush()) {
        setOn(true);
      } else {
        setError("Ative as notificações do navegador pra usar esse recurso.");
      }
    } finally {
      setPending(false);
    }
  }

  return { on, pending, error, toggle };
}
