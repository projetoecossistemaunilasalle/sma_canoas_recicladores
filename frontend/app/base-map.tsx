"use client";

import type { ComponentProps } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CANOAS_CENTER } from "@/lib/geo";

/**
 * Every map in the app: a Leaflet map over Canoas with the OpenStreetMap
 * tiles and their attribution. Leaflet touches `window` at import time, so
 * anything rendering this has to be loaded with next/dynamic({ ssr: false })
 * (see the *-client.tsx wrappers), with <MapSkeleton> as its placeholder.
 */
export function BaseMap({ children, center = CANOAS_CENTER, zoom = 13, ...props }: ComponentProps<typeof MapContainer>) {
  return (
    <MapContainer center={center} zoom={zoom} {...props}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
}
