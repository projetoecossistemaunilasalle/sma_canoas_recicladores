"use client";

import { useFleetTracking } from "./use-fleet-tracking";

/** One vehicle's live position (and heading), or null until the first one arrives. */
export function useVehicleTracking(vehicleId: string | null) {
  const positions = useFleetTracking(vehicleId ? [vehicleId] : []);
  const position = vehicleId ? (positions[vehicleId] ?? null) : null;
  return { position, heading: position?.heading ?? null };
}
