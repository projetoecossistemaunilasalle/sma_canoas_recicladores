"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CANOAS_CENTER } from "@/lib/geo";
import { vehicleColorHex, vehicleIconTextColor } from "@/lib/vehicle-options";
import type { LatLng, PublicVehicleSummary } from "@/lib/types";

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

function arrowDivIcon(headingDeg: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;transform:rotate(${headingDeg}deg);">
      <svg width="14" height="14" viewBox="0 0 24 24" style="filter:drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
        <path d="M12 2 L20 20 L12 15 L4 20 Z" fill="#ffffff" stroke="#3755C3" stroke-width="1.5"/>
      </svg>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function bearingDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Places a small arrow every ~90m of real (not straight-line) distance along
// the path, pointing in the direction of travel at that point — a
// serpentine collection route can double back on the same block more than
// once, and without a direction cue the drawn line alone doesn't say which
// pass comes first.
const ARROW_SPACING_METERS = 90;

function sampleDirectionArrows(path: LatLng[]): { position: LatLng; heading: number }[] {
  if (path.length < 2) return [];
  const arrows: { position: LatLng; heading: number }[] = [];
  let distSinceLast = ARROW_SPACING_METERS;
  for (let i = 1; i < path.length; i++) {
    distSinceLast += haversineMeters(path[i - 1], path[i]);
    if (distSinceLast >= ARROW_SPACING_METERS) {
      arrows.push({ position: path[i], heading: bearingDeg(path[i - 1], path[i]) });
      distSinceLast = 0;
    }
  }
  return arrows;
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
  path?: LatLng[];
  stops?: { streetId: number; name: string | null; lat: number; lng: number }[];
}

export function PublicMap({
  addressPosition,
  truckPosition,
  truckHeading,
  vehicle,
  followTruck,
  onManualPan,
  onResumeFollow,
  path = [],
  stops = [],
}: PublicMapProps) {
  const directionArrows = useMemo(() => sampleDirectionArrows(path), [path]);
  // Leaflet's SVG renderer clips/simplifies polylines against the current
  // viewport per-render for performance. In testing, that pipeline dropped
  // a real interior vertex of a path that both extends far off-screen (the
  // reconnection leg) and loops tightly within the visible area (a street
  // walked, then immediately walked back) — even with smoothFactor={0}, a
  // single long polyline still turned that into a straight line cutting
  // across a block that was never actually driven. Passing the path as many
  // independent 2-point segments (Leaflet's native multi-part Polyline)
  // leaves no "interior" for any clip/simplify pass to discard — each
  // segment is either drawn whole or dropped whole.
  const pathSegments = useMemo<[number, number][][]>(
    () => path.slice(1).map((p, i) => [[path[i].lat, path[i].lng], [p.lat, p.lng]]),
    [path]
  );

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

        {pathSegments.length > 0 ? (
          <>
            <Polyline
              positions={pathSegments}
              pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9 }}
              smoothFactor={0}
            />
            <Polyline
              positions={pathSegments}
              pathOptions={{ color: "#3755C3", weight: 4, opacity: 0.95 }}
              smoothFactor={0}
            />
          </>
        ) : null}

        {directionArrows.map((arrow, index) => (
          <Marker
            key={index}
            position={[arrow.position.lat, arrow.position.lng]}
            icon={arrowDivIcon(arrow.heading)}
            interactive={false}
          />
        ))}

        {stops.map((stop, index) => (
          <CircleMarker
            key={`${stop.streetId}-${index}`}
            center={[stop.lat, stop.lng]}
            radius={4}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#3755C3", fillOpacity: 1 }}
          >
            {stop.name ? <Tooltip direction="top">{stop.name}</Tooltip> : null}
          </CircleMarker>
        ))}

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
