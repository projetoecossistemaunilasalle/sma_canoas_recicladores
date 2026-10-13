"use client";

import { AddressSearch } from "./address-search";
import { AddressSideControls } from "./address-side-controls";
import AddressPinMap from "./address-pin-map-client";
import type { AddressPinState } from "@/lib/use-address-pin";

/**
 * Register/profile address field: street search, "tap your house" map, side
 * confirmation and the (optional) house number. State lives in the parent's
 * useAddressPin() so the form can read `state.value` on submit.
 */
export function AddressPicker({ state }: { state: AddressPinState }) {
  const { search, pin, street, side, number, setNumber, selectSearch, clear, placePin } = state;

  return (
    <div className="flex flex-col gap-3">
      <AddressSearch onSelect={selectSearch} onClear={clear} selectedLabel={search?.label ?? null} />

      {search ? (
        <>
          <AddressPinMap
            focus={{ lat: search.lat, lng: search.lng }}
            pin={pin}
            streetLine={street?.line ?? null}
            side={side}
            onPick={placePin}
          />
          <AddressSideControls state={state} />
          <div>
            <label className="text-label-lg text-on-surface-variant mb-1 block" htmlFor="address-number">
              Número (opcional)
            </label>
            <input
              id="address-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              inputMode="numeric"
              maxLength={20}
              placeholder="Ex.: 123"
              className="w-40 bg-surface-container-lowest text-on-surface text-body-md rounded-xl px-4 py-3 outline-none border-2 border-transparent focus:border-primary placeholder:text-on-surface-variant/50"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
