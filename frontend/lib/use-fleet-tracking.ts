"use client";

import { useEffect, useState } from "react";

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
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3001`;
}

// Same public /ws/tracking channel as useVehicleTracking, but subscribes to
// a whole set of vehicles over one shared connection — for the cooperative
// fleet dashboard, which needs to watch many trucks at once rather than one.
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
          if (msg.type !== "position") return;
          setPositions((prev) => ({
            ...prev,
            [msg.vehicleId]: { lat: msg.lat, lng: msg.lng, recordedAt: msg.recordedAt },
          }));
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
    };
  }, [key]);

  return positions;
}
