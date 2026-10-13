"use client";

import { useEffect, useState } from "react";
import { computeBearing } from "./geo";

export interface TrackedPosition {
  lat: number;
  lng: number;
  recordedAt: string;
  /** Derived from this vehicle's previous position — there's no heading column in vehicle_positions. */
  heading: number | null;
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

/**
 * Live positions for a set of vehicles over the public /ws/tracking channel
 * (backend/src/routes/ws/ws.routes.ts) — one connection for all of them,
 * reconnecting with backoff if it drops. The fleet dashboard watches the
 * whole fleet; useVehicleTracking is the one-vehicle case.
 */
export function useFleetTracking(vehicleIds: string[]): Record<string, TrackedPosition> {
  const [positions, setPositions] = useState<Record<string, TrackedPosition>>({});
  const key = vehicleIds.slice().sort().join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByEffect = false;
    let attempt = 0;

    function connect() {
      socket = new WebSocket(`${resolveWsUrl()}/ws/tracking`);

      socket.addEventListener("open", () => {
        attempt = 0;
        for (const vehicleId of ids) {
          socket?.send(JSON.stringify({ type: "subscribe", vehicleId }));
        }
      });

      socket.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data) as PositionMessage;
          if (msg.type !== "position" || !ids.includes(msg.vehicleId)) return;
          setPositions((prev) => {
            const last = prev[msg.vehicleId];
            return {
              ...prev,
              [msg.vehicleId]: {
                lat: msg.lat,
                lng: msg.lng,
                recordedAt: msg.recordedAt,
                heading: last ? computeBearing(last, msg) : null,
              },
            };
          });
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
      setPositions({});
    };
  }, [key]);

  return positions;
}
