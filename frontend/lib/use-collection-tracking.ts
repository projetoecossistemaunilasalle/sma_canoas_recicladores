"use client";

import { useCallback, useEffect, useState } from "react";
import { checkCollectionForAddress } from "@/lib/public-api";
import { useVehicleTracking } from "@/lib/use-vehicle-tracking";
import type { AddressPoint, CollectionCheckResult, PublicVehicleSummary } from "@/lib/types";

// While waiting for the collection window to open, or while it's active,
// re-check periodically so scheduled_today -> arriving -> passed transitions
// show up without the citizen having to re-search their address.
const POLL_INTERVAL_MS = 30_000;

function vehicleFromResult(result: CollectionCheckResult | null): PublicVehicleSummary | null {
  if (!result || result.status === "no_route" || result.status === "other_side_only") return null;
  return result.vehicle;
}

function pointKey(point: AddressPoint | null): string | null {
  return point ? `${point.lat},${point.lng},${point.streetId},${point.side}` : null;
}

/**
 * Shared by the anonymous public home (house pinned on the map) and the
 * citizen "Minha Coleta" screen (fixed address from the profile) — both
 * just need "poll this point until the collection status changes, and
 * track the vehicle live once it's arriving."
 */
export function useCollectionTracking(point: AddressPoint | null) {
  const [result, setResult] = useState<CollectionCheckResult | null>(null);
  // Tracks the point `result` was fetched for, so a change can be caught
  // synchronously during render (React's documented alternative to an
  // Effect for "reset state when a prop changes") — otherwise the previous
  // point's stale result would flash for a frame after the address (or the
  // confirmed side) changes, before the effect below gets a chance to clear it.
  const key = pointKey(point);
  const [resultKey, setResultKey] = useState(key);
  if (resultKey !== key) {
    setResultKey(key);
    setResult(null);
  }

  // Depend on the point's primitive fields, not the object — callers pass a
  // fresh-but-equal object on every render.
  const lat = point?.lat ?? null;
  const lng = point?.lng ?? null;
  const streetId = point?.streetId ?? null;
  const side = point?.side ?? null;

  const runCheck = useCallback(async () => {
    if (lat == null || lng == null || streetId == null || side == null) return;
    try {
      const next = await checkCollectionForAddress({ lat, lng, streetId, side });
      setResult(next);
    } catch {
      // Transient network hiccup — keep showing the last known result
      // rather than replacing it with an error state.
    }
  }, [lat, lng, streetId, side]);

  // Fires the actual fetch whenever the point changes (including on mount).
  // Calls checkCollectionForAddress directly (rather than runCheck()) so the
  // eventual setResult happens inside a .then callback, not synchronously in
  // the effect body itself.
  useEffect(() => {
    if (lat == null || lng == null || streetId == null || side == null) return;
    let ignore = false;
    checkCollectionForAddress({ lat, lng, streetId, side })
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
  }, [lat, lng, streetId, side]);

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
