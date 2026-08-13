"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon paths break once bundled by Next.js — point
// them at the same CDN Leaflet itself ships from instead of local assets.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface FleetMapPoint {
  id: string;
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
}

// Canoas, RS — used only as the fallback center when no vehicle has a position yet.
const CANOAS_CENTER: [number, number] = [-29.9177, -51.1844];

function FitBounds({ points }: { points: FleetMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, points]);

  return null;
}

export function FleetMap({ points }: { points: FleetMapPoint[] }) {
  return (
    <MapContainer
      center={CANOAS_CENTER}
      zoom={13}
      scrollWheelZoom={false}
      className="w-full h-80 rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>
            <strong>{p.label}</strong>
            <br />
            {p.sublabel}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
