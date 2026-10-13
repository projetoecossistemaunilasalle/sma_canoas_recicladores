"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./map-skeleton";

// Leaflet needs `window` — see base-map.tsx. Shared by the public home and
// the citizen's Minha Coleta screen.
const PublicMapClient = dynamic(() => import("./public-map").then((m) => m.PublicMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default PublicMapClient;
