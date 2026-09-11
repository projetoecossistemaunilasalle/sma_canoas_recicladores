"use client";

import { useEffect, useState } from "react";
import PublicMapClient from "./public-map-client";
import { AddressSearch } from "./address-search";
import { AuthPanel } from "./auth-panel";
import { BrandHeader } from "./brand-header";
import { CollectionPanel } from "./collection-panel";
import { useCollectionTracking } from "@/lib/use-collection-tracking";
import { getPublicCooperatives } from "@/lib/public-api";
import type { GeocodeResult, PublicCooperativeSummary } from "@/lib/types";

export function PublicHome() {
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [followTruck, setFollowTruck] = useState(true);
  const [cooperatives, setCooperatives] = useState<PublicCooperativeSummary[]>([]);
  const { result, truckPosition, heading, vehicle, path, stops } = useCollectionTracking(
    selected?.lat ?? null,
    selected?.lng ?? null
  );

  useEffect(() => {
    getPublicCooperatives()
      .then(setCooperatives)
      .catch(() => setCooperatives([]));
  }, []);

  function handleSelect(address: GeocodeResult) {
    setSelected(address);
    setFollowTruck(true);
  }

  function handleReset() {
    setSelected(null);
    setFollowTruck(true);
  }

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
        cooperatives={cooperatives}
      />

      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row items-start justify-between gap-3 pointer-events-none">
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
        <div className="pointer-events-auto shrink-0 self-end sm:self-start">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
