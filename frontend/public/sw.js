// Minimal service worker for Web Push proximity notifications
// (frontend/lib/push.ts / backend/src/integrations/proximity-notifier.ts).
// Registering it is what lets a push arrive even with the tab closed.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Canoas Coleta+", {
      body: data.body || "",
      tag: "collection-proximity",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/citizen/minha-coleta"));
});
