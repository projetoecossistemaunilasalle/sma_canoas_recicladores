// The route builder's visual vocabulary — shared by the map (route-map.tsx)
// and its legend, so what the legend promises is what the map draws.
export const ROUTE_COLORS = {
  /** Streets the cooperative collects on (the stops). */
  collect: "#e07b00",
  /** Streets the truck only drives through to reach the next stop. */
  pass: "#4f6d8f",
  start: "#1f8a3d",
  end: "#c62828",
  /** Drawn under every line so it stands out from the map's own roads. */
  casing: "#ffffff",
} as const;
