"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module-evaluation time, so it can't be
// server-rendered. dashboard/page.tsx is a Server Component and can't call
// next/dynamic(..., { ssr: false }) itself — that's only allowed inside a
// Client Component — so this thin wrapper exists purely to hold that call.
const FleetMap = dynamic(() => import("./fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl bg-surface-container-highest animate-pulse" />
  ),
});

export default FleetMap;
