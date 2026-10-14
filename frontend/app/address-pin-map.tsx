"use client";

import { useEffect } from "react";
import { Marker, useMap, useMapEvents } from "react-leaflet";
import { BaseMap } from "./base-map";
import { homeIcon } from "@/lib/map-icons";
import { HouseSideHighlight } from "./street-side-line";
import type { HouseSide, LatLng, LatLngTuple } from "@/lib/types";

export interface AddressPinMapProps {
  /** Where the searched street is — the map jumps there when it changes. */
  focus: LatLng | null;
  pin: LatLng | null;
  streetLine: LatLngTuple[] | null;
  side: HouseSide | null;
  onPick: (lat: number, lng: number) => void;
}

function Recenter({ focus }: { focus: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], 18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus?.lat, focus?.lng]);
  return null;
}

function PickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** The small "tap on your house" map used inside the profile and cooperative forms. */
export function AddressPinMap({ focus, pin, streetLine, side, onPick }: AddressPinMapProps) {
  return (
    <BaseMap
      center={focus ? [focus.lat, focus.lng] : undefined}
      zoom={focus ? 18 : 13}
      scrollWheelZoom={false}
      className="w-full h-64 rounded-xl z-0 cursor-crosshair"
    >
      <Recenter focus={focus} />
      <PickHandler onPick={onPick} />
      {streetLine ? <HouseSideHighlight line={streetLine} side={side} /> : null}
      {pin ? <Marker position={[pin.lat, pin.lng]} icon={homeIcon} interactive={false} /> : null}
    </BaseMap>
  );
}
