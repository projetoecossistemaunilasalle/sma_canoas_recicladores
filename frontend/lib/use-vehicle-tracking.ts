"use client";

import { useEffect, useRef, useState } from "react";
import { computeBearing } from "./geo";

interface TrackedPosition {
  lat: number;
  lng: number;
  recordedAt: string;
}

interface PositionMessage {
  type: "position";
  vehicleId: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

function resolveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  // Dev fallback: same host as the page, backend's default local port.
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3001`;
}

// Subscribes to a single vehicle's live position over the public /ws/tracking
// channel (backend/src/routes/ws/ws.routes.ts). Reconnects with backoff if the
// connection drops unexpectedly. Heading is derived client-side from the last
// two positions — there's no heading column in vehicle_positions.
export function useVehicleTracking(vehicleId: string | null) {
  const [position, setPosition] = useState<TrackedPosition | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const previousPositionRef = useRef<TrackedPosition | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;
    let attempt = 0;

    function connect() {
      socket = new WebSocket(`${resolveWsUrl()}/ws/tracking`);

      socket.addEventListener("open", () => {
        attempt = 0;
        socket?.send(JSON.stringify({ type: "subscribe", vehicleId }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data) as PositionMessage;
          if (msg.type !== "position" || msg.vehicleId !== vehicleId) return;
          const next: TrackedPosition = { lat: msg.lat, lng: msg.lng, recordedAt: msg.recordedAt };
          if (previousPositionRef.current) {
            setHeading(computeBearing(previousPositionRef.current, next));
          }
          previousPositionRef.current = next;
          setPosition(next);
        } catch {
          // ignore malformed messages
        }
      });

      socket.addEventListener("close", () => {
        if (closedByEffect) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        reconnectTimer = setTimeout(connect, delay);
      });
    }

    connect();

    return () => {
      closedByEffect = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
      previousPositionRef.current = null;
      setPosition(null);
      setHeading(null);
    };
  }, [vehicleId]);

  return { position, heading };
}
