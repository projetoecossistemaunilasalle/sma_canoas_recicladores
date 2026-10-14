"use client";

import { useRef, useState } from "react";
import { resolveAddressStreet } from "./public-api";
import type { AddressStreet, CitizenAddress, GeocodeResult, HouseSide, LatLng } from "./types";

/**
 * The citizen address flow shared by the profile and the public home:
 * search the street → tap the house on the map → confirm (or flip) which
 * side of the street it's on → optional house number. `value` is only set
 * once all of pin, segment and side are known — collection checks need all three.
 */
export function useAddressPin(initial: CitizenAddress | null = null) {
  const [search, setSearch] = useState<GeocodeResult | null>(
    initial
      ? {
          label: initial.label,
          lat: initial.lat,
          lng: initial.lng,
          road: initial.streetName,
          neighborhoods: [],
          crossStreet: null,
        }
      : null
  );
  const [pin, setPin] = useState<LatLng | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [street, setStreet] = useState<AddressStreet | null>(
    initial
      ? { streetId: initial.streetId, name: initial.streetName, line: initial.streetLine, side: initial.side }
      : null
  );
  const [side, setSide] = useState<HouseSide | null>(initial?.side ?? null);
  const [number, setNumber] = useState(initial?.number ?? "");
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a slow lookup for an earlier tap landing after a newer one.
  const pickSeq = useRef(0);

  function selectSearch(result: GeocodeResult) {
    pickSeq.current++;
    setSearch(result);
    setPin(null);
    setStreet(null);
    setSide(null);
    setError(null);
    setResolving(false);
  }

  function clear() {
    pickSeq.current++;
    setSearch(null);
    setPin(null);
    setStreet(null);
    setSide(null);
    setError(null);
    setResolving(false);
  }

  async function placePin(lat: number, lng: number) {
    const seq = ++pickSeq.current;
    setPin({ lat, lng });
    // Drop the previous pin's street/side right away — otherwise `value`
    // would briefly pair the new pin with the old side and fire a check for it.
    setStreet(null);
    setSide(null);
    setError(null);
    setResolving(true);
    try {
      const found = await resolveAddressStreet(lat, lng, search?.road ?? null);
      if (seq !== pickSeq.current) return;
      setStreet(found);
      setSide(found?.side ?? null);
      if (!found) setError("Não achamos nenhuma rua perto desse ponto. Toque em cima da sua casa.");
    } catch {
      if (seq === pickSeq.current) setError("Não foi possível conferir a rua. Tente de novo.");
    } finally {
      if (seq === pickSeq.current) setResolving(false);
    }
  }

  // From "unknown" (pin on the centerline) this just picks one side to
  // start from; the highlight then shows which, and another flip swaps it.
  function flipSide() {
    setSide((s) => (s === "left" ? "right" : "left"));
  }

  const value: CitizenAddress | null =
    search && pin && street && side
      ? {
          label: search.label,
          lat: pin.lat,
          lng: pin.lng,
          number: number.trim() || null,
          streetId: street.streetId,
          streetName: street.name,
          streetLine: street.line,
          side,
        }
      : null;

  return {
    search,
    pin,
    street,
    side,
    number,
    setNumber,
    resolving,
    error,
    selectSearch,
    clear,
    placePin,
    flipSide,
    value,
    /** A street was searched but the pin/side isn't finished yet. */
    incomplete: search !== null && value === null,
  };
}

export type AddressPinState = ReturnType<typeof useAddressPin>;
