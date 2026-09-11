"use client";

import { useCallback, useEffect, useState } from "react";
import { checkCollectionForAddress } from "@/lib/public-api";
import { useVehicleTracking } from "@/lib/use-vehicle-tracking";
import type { CollectionCheckResult, PublicVehicleSummary } from "@/lib/types";

// While waiting for the collection window to open, or while it's active,
// re-check periodically so scheduled_today -> arriving -> passed transitions
// show up without the citizen having to re-search their address.
const POLL_INTERVAL_MS = 30_000;

function vehicleFromResult(result: CollectionCheckResult | null): PublicVehicleSummary | null {
  if (!result || result.status === "no_route") return null;
  return result.vehicle;
}

/**
 * Shared by the anonymous public home (address picked via search) and the
 * citizen "Minha Coleta" screen (fixed address from the profile) — both
 * just need "poll this point until the collection status changes, and
 * track the vehicle live once it's arriving."
 */
export function useCollectionTracking(lat: number | null, lng: number | null) {
  const [result, setResult] = useState<CollectionCheckResult | null>(null);
  // Tracks the point `result` was fetched for, so a change can be caught
  // synchronously during render (React's documented alternative to an
  // Effect for "reset state when a prop changes") — otherwise the previous
  // point's stale result would flash for a frame after the address changes,
  // before the effect below gets a chance to clear it.
  const [resultPoint, setResultPoint] = useState({ lat, lng });
  if (resultPoint.lat !== lat || resultPoint.lng !== lng) {
    setResultPoint({ lat, lng });
    setResult(null);
  }

  const runCheck = useCallback(async () => {
    if (lat == null || lng == null) return;
    try {
      const next = await checkCollectionForAddress(lat, lng);
      setResult(next);
    } catch {
      // Transient network hiccup — keep showing the last known result
      // rather than replacing it with an error state.
    }
  }, [lat, lng]);

  // Fires the actual fetch whenever the point changes (including on mount).
  // Calls checkCollectionForAddress directly (rather than runCheck()) so the
  // eventual setResult happens inside a .then callback, not synchronously in
  // the effect body itself.
  useEffect(() => {
    if (lat == null || lng == null) return;
    let ignore = false;
    checkCollectionForAddress(lat, lng)
      .then((next) => {
        if (!ignore) setResult(next);
      })
      .catch(() => {
        // Transient network hiccup — keep showing the last known result
        // rather than replacing it with an error state.
      });
    return () => {
      ignore = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    if (!result) return;
    if (result.status !== "scheduled_today" && result.status !== "arriving") return;
    const interval = setInterval(runCheck, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [result, runCheck]);

  const trackedVehicleId = result?.status === "arriving" ? result.vehicle.id : null;
  const { position: livePosition, heading } = useVehicleTracking(trackedVehicleId);
  const truckPosition = result?.status === "arriving" ? (livePosition ?? result.position) : null;
  const vehicle = vehicleFromResult(result);
  const path = result?.status === "arriving" ? result.path : undefined;
  const stops = result?.status === "arriving" ? result.stops : undefined;

  return { result, truckPosition, heading, vehicle, path, stops, refresh: runCheck };
}
