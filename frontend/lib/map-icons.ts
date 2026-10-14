import L from "leaflet";
import { vehicleColorHex, vehicleIconTextColor, vehicleTypeIcon } from "./vehicle-options";
import type { VehicleType } from "./types";

// Leaflet divIcons shared across the maps. Client-only, like everything that imports leaflet.

export const homeIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#6A2C91;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;color:#fff;transform:rotate(45deg);line-height:1;">home</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  popupAnchor: [0, -30],
});

export const cooperativeIcon = L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#2E7D32;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;color:#fff;line-height:1;">recycling</span>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -14],
});

/**
 * A round pin filled with the vehicle's color and its type's glyph — the
 * fleet map and the citizen's "truck on its way". With a heading, the disc
 * turns to the direction of travel (the glyph stays upright).
 */
export function vehicleDivIcon({
  color,
  type,
  heading = null,
  size = 32,
}: {
  color: string | null;
  type: VehicleType;
  heading?: number | null;
  size?: number;
}) {
  const rotation = heading ?? 0;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${vehicleColorHex(color)};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);transition:transform 0.4s ease;">
      <span class="material-symbols-outlined" style="font-size:${Math.round(size * 0.55)}px;color:${vehicleIconTextColor(color)};line-height:1;transform:rotate(${-rotation}deg);">${vehicleTypeIcon(type)}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export function arrowDivIcon(headingDeg: number, color = "#6A2C91", size = 14, className = "") {
  return L.divIcon({
    className,
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(${headingDeg}deg);">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
        <path d="M12 2 L20 20 L12 15 L4 20 Z" fill="#ffffff" stroke="${color}" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
