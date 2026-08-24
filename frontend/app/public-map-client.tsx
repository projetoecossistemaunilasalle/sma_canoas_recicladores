"use client";

import dynamic from "next/dynamic";
import type { PublicMapProps } from "./public-map";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered — same reason dashboard/fleet-map-client.tsx exists.
const PublicMap = dynamic(() => import("./public-map").then((m) => m.PublicMap), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-surface-container-highest animate-pulse" />,
});

export default function PublicMapClient(props: PublicMapProps) {
  return <PublicMap {...props} />;
}
