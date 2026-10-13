"use client";

import { useEffect, useState } from "react";
import PublicMapClient from "./public-map-client";
import { AddressSearch } from "./address-search";
import { AddressSideControls } from "./address-side-controls";
import { AuthPanel } from "./auth-panel";
import { BrandHeader } from "./brand-header";
import { CollectionPanel } from "./collection-panel";
import { useCollectionTracking } from "@/lib/use-collection-tracking";
import { useAddressPin } from "@/lib/use-address-pin";
import { getPublicCooperatives } from "@/lib/public-api";
import type { GeocodeResult, PublicCooperativeSummary } from "@/lib/types";

export function PublicHome() {
  const addressPin = useAddressPin();
  const { search, pin, street, side, value } = addressPin;
  const [followTruck, setFollowTruck] = useState(true);
  const [cooperatives, setCooperatives] = useState<PublicCooperativeSummary[]>([]);
  // Checks run only once the house is pinned and its side known — the
  // searched street alone can't say which side/stretch the citizen is on.
  const { result, truckPosition, heading, vehicle, path, stops } = useCollectionTracking(value);

  useEffect(() => {
    getPublicCooperatives()
      .then(setCooperatives)
      .catch(() => setCooperatives([]));
  }, []);

  function handleSelect(address: GeocodeResult) {
    addressPin.selectSearch(address);
    setFollowTruck(true);
  }

  function handleReset() {
    addressPin.clear();
    setFollowTruck(true);
  }

  function handleMapClick(lat: number, lng: number) {
    void addressPin.placePin(lat, lng);
    setFollowTruck(true);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <PublicMapClient
        addressPosition={pin}
        focusPosition={search}
        onMapClick={search ? handleMapClick : undefined}
        pickedStreet={street ? { line: street.line, side } : null}
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
            selectedLabel={search?.label ?? null}
          />
          {search ? (
            <div className="w-full bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/30 p-4">
              <AddressSideControls state={addressPin} />
            </div>
          ) : null}
          {search && value && result ? (
            <div className="w-full pointer-events-auto">
              <CollectionPanel address={search.label} result={result} onReset={handleReset} />
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
