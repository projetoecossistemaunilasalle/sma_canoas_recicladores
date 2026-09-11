import L from "leaflet";

let patched = false;

/**
 * Leaflet's default marker icon paths break once bundled by Next.js — point
 * them at the same CDN Leaflet itself ships from instead of the missing
 * local assets. Call once from any client component that renders a default
 * (non-custom) Leaflet marker.
 */
export function ensureLeafletDefaultIcon() {
  if (patched) return;
  patched = true;
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
