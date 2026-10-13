"use client";

import { useEffect, useMemo } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { BaseMap } from "@/app/base-map";
import { vehicleDivIcon } from "@/lib/map-icons";
import type { VehicleType } from "@/lib/types";

export interface FleetMapPoint {
  id: string;
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
  color: string | null;
  type: VehicleType;
}

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

// Purely presentational — the caller (FleetMonitor) owns the live-tracking
// WebSocket and passes already-current lat/lng in `points`, so both the map
// and the vehicle list below it stay in sync off one shared connection.
// One pin per vehicle, in its color with its type's glyph, so the fleet reads
// at a glance instead of every truck being the same pin.
export function FleetMap({ points }: { points: FleetMapPoint[] }) {
  const icons = useMemo(
    () => new Map(points.map((p) => [p.id, vehicleDivIcon({ color: p.color, type: p.type })])),
    [points]
  );

  return (
    <BaseMap scrollWheelZoom={false} className="w-full h-80 rounded-xl z-0">
      <FitBounds points={points} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.id)}>
          <Popup>
            <strong>{p.label}</strong>
            <br />
            {p.sublabel}
          </Popup>
        </Marker>
      ))}
    </BaseMap>
  );
}
