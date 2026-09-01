"use client";

import { useCallback, useEffect, useState } from "react";
import PublicMapClient from "./public-map-client";
import { AddressSearch } from "./address-search";
import { AuthPanel } from "./auth-panel";
import { BrandHeader } from "./brand-header";
import { CollectionPanel } from "./collection-panel";
import { checkCollectionForAddress } from "@/lib/public-api";
import { useVehicleTracking } from "@/lib/use-vehicle-tracking";
import type { CollectionCheckResult, GeocodeResult, PublicVehicleSummary } from "@/lib/types";

// While waiting for the collection window to open, or while it's active,
// re-check periodically so scheduled_today -> arriving -> passed transitions
// show up without the citizen having to re-search their address.
const POLL_INTERVAL_MS = 30_000;

function vehicleFromResult(result: CollectionCheckResult | null): PublicVehicleSummary | null {
  if (!result || result.status === "no_route") return null;
  return result.vehicle;
}

export function PublicHome() {
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [result, setResult] = useState<CollectionCheckResult | null>(null);
  const [followTruck, setFollowTruck] = useState(true);

  const trackedVehicleId = result?.status === "arriving" ? result.vehicle.id : null;
  const { position: livePosition, heading } = useVehicleTracking(trackedVehicleId);

  const runCheck = useCallback(async (lat: number, lng: number) => {
    try {
      const next = await checkCollectionForAddress(lat, lng);
      setResult(next);
    } catch {
      // Transient network hiccup — keep showing the last known result
      // rather than replacing it with an error state.
    }
  }, []);

  async function handleSelect(address: GeocodeResult) {
    setSelected(address);
    setResult(null);
    setFollowTruck(true);
    await runCheck(address.lat, address.lng);
  }

  function handleReset() {
    setSelected(null);
    setResult(null);
    setFollowTruck(true);
  }

  useEffect(() => {
    if (!selected || !result) return;
    if (result.status !== "scheduled_today" && result.status !== "arriving") return;

    const interval = setInterval(() => {
      runCheck(selected.lat, selected.lng);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selected, result, runCheck]);

  const truckPosition = result?.status === "arriving" ? (livePosition ?? result.position) : null;
  const vehicle = vehicleFromResult(result);
  const path = result?.status === "arriving" ? result.path : undefined;
  const stops = result?.status === "arriving" ? result.stops : undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PublicMapClient
        addressPosition={selected}
        truckPosition={truckPosition}
        truckHeading={heading}
        vehicle={vehicle}
        followTruck={followTruck}
        onManualPan={() => setFollowTruck(false)}
        onResumeFollow={() => setFollowTruck(true)}
        path={path}
        stops={stops}
      />

      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3 items-start w-full max-w-sm">
          <BrandHeader />
          <AddressSearch
            onSelect={handleSelect}
            onClear={handleReset}
            selectedLabel={selected?.label ?? null}
          />
          {selected && result ? (
            <div className="w-full pointer-events-auto">
              <CollectionPanel address={selected.label} result={result} onReset={handleReset} />
            </div>
          ) : null}
        </div>
        <div className="pointer-events-auto shrink-0">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
