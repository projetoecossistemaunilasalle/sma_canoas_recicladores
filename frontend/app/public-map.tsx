"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CANOAS_CENTER } from "@/lib/geo";
import { vehicleColorHex, vehicleIconTextColor } from "@/lib/vehicle-options";
import type { PublicVehicleSummary } from "@/lib/types";

// Leaflet's default marker icon paths break once bundled by Next.js — same
// workaround used in dashboard/fleet-map.tsx and tracking/tracking-map.tsx.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const homeIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#3755C3;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;">
    <span class="material-symbols-outlined" style="font-size:18px;color:#fff;transform:rotate(45deg);line-height:1;">home</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  popupAnchor: [0, -30],
});

function truckDivIcon(color: string | null, heading: number | null) {
  const fill = vehicleColorHex(color);
  const textColor = vehicleIconTextColor(color);
  const rotation = heading ?? 0;
  return L.divIcon({
    className: "",
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${fill};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);transition:transform 0.4s ease;">
      <span class="material-symbols-outlined" style="font-size:22px;color:${textColor};line-height:1;transform:rotate(${-rotation}deg);">local_shipping</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function ManualPanDetector({ onManualPan }: { onManualPan: () => void }) {
  // Only dragstart counts as "the user moved the map" — recentering via
  // setView/panTo (RecenterOnAddress, FollowTruck) never fires this event,
  // so programmatic moves never accidentally cancel follow mode.
  useMapEvents({ dragstart: onManualPan });
  return null;
}

function RecenterOnAddress({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.lat, position.lng], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position?.lat, position?.lng]);
  return null;
}

function FollowTruck({
  position,
  follow,
}: {
  position: { lat: number; lng: number } | null;
  follow: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (position && follow) map.panTo([position.lat, position.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, position?.lat, position?.lng, follow]);
  return null;
}

export interface PublicMapProps {
  addressPosition: { lat: number; lng: number } | null;
  truckPosition: { lat: number; lng: number } | null;
  truckHeading: number | null;
  vehicle: PublicVehicleSummary | null;
  followTruck: boolean;
  onManualPan: () => void;
  onResumeFollow: () => void;
}

export function PublicMap({
  addressPosition,
  truckPosition,
  truckHeading,
  vehicle,
  followTruck,
  onManualPan,
  onResumeFollow,
}: PublicMapProps) {
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={CANOAS_CENTER}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ManualPanDetector onManualPan={onManualPan} />
        {!truckPosition ? <RecenterOnAddress position={addressPosition} /> : null}
        <FollowTruck position={truckPosition} follow={followTruck} />

        {addressPosition ? <Marker position={[addressPosition.lat, addressPosition.lng]} icon={homeIcon} /> : null}

        {truckPosition ? (
          <Marker
            position={[truckPosition.lat, truckPosition.lng]}
            icon={truckDivIcon(vehicle?.color ?? null, truckHeading)}
          >
            <Tooltip permanent direction="top" offset={[0, -22]} className="truck-tooltip">
              🚛 Coleta{vehicle?.plate ? ` • ${vehicle.plate}` : ""}
            </Tooltip>
          </Marker>
        ) : null}
      </MapContainer>

      {truckPosition && !followTruck ? (
        <button
          type="button"
          onClick={onResumeFollow}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-surface-container-lowest text-on-surface text-label-lg px-4 py-2.5 rounded-full shadow-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">navigation</span>
          Seguir caminhão
        </button>
      ) : null}
    </div>
  );
}
