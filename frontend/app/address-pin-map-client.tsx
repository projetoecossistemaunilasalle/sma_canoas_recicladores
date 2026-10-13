"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./map-skeleton";

// Leaflet needs `window` — see base-map.tsx. Shared by the citizen address
// picker and the cooperative form.
const AddressPinMap = dynamic(() => import("./address-pin-map").then((m) => m.AddressPinMap), {
  ssr: false,
  loading: () => <MapSkeleton className="w-full h-64" />,
});

export default AddressPinMap;
