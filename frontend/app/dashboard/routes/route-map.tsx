"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseWktLineString } from "@/lib/format";

const CANOAS_CENTER: [number, number] = [-29.9177, -51.1844];
const DRAG_SAMPLE_MS = 220;

function FitBounds({ segments }: { segments: [number, number][][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    const allPoints = segments.flat();
    if (allPoints.length === 0) return;
    fitted.current = true;
    if (allPoints.length === 1) {
      map.setView(allPoints[0], 16);
      return;
    }
    map.fitBounds(L.latLngBounds(allPoints), { padding: [32, 32] });
  }, [map, segments]);

  return null;
}

/**
 * Click adds one point; while drawMode is on, holding the mouse down and
 * dragging samples points continuously (throttled) so the interaction feels
 * like drawing instead of one-street-at-a-time clicking. Map panning is
 * disabled while drawMode is on so drag gestures aren't ambiguous.
 */
function DrawHandler({
  drawMode,
  onPoint,
}: {
  drawMode: boolean;
  onPoint: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const dragging = useRef(false);
  const lastSample = useRef(0);

  useEffect(() => {
    if (drawMode) map.dragging.disable();
    else map.dragging.enable();
  }, [map, drawMode]);

  useMapEvents({
    click(e) {
      if (!drawMode) return;
      onPoint(e.latlng.lat, e.latlng.lng);
    },
    mousedown(e) {
      if (!drawMode) return;
      dragging.current = true;
      lastSample.current = Date.now();
      onPoint(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      if (!drawMode || !dragging.current) return;
      const now = Date.now();
      if (now - lastSample.current < DRAG_SAMPLE_MS) return;
      lastSample.current = now;
      onPoint(e.latlng.lat, e.latlng.lng);
    },
    mouseup() {
      dragging.current = false;
    },
  });

  return null;
}

export function RouteMap({
  pathGeoms,
  stopGeoms,
  drawMode = false,
  onPoint,
}: {
  /** Full connected path (stops + auto-filled connectors) — drawn as the route line. */
  pathGeoms: string[];
  /** Just the streets the user picked as stops — get a dot marker. */
  stopGeoms: string[];
  drawMode?: boolean;
  onPoint?: (lat: number, lng: number) => void;
}) {
  const pathSegments = pathGeoms.map(parseWktLineString);
  const stopPoints = stopGeoms.map(parseWktLineString).map((seg) => seg[0]).filter(Boolean);

  return (
    <MapContainer
      center={CANOAS_CENTER}
      zoom={13}
      scrollWheelZoom={false}
      className={`w-full h-full min-h-64 rounded-xl z-0 ${drawMode ? "cursor-crosshair" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds segments={pathSegments.length > 0 ? pathSegments : stopPoints.map((p) => [p])} />
      {onPoint ? <DrawHandler drawMode={drawMode} onPoint={onPoint} /> : null}
      {pathSegments.map((positions, i) => (
        <Polyline key={i} positions={positions} pathOptions={{ color: "#006b47", weight: 5 }} />
      ))}
      {stopPoints.map((pos, i) => (
        <CircleMarker
          key={i}
          center={pos}
          radius={7}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#006b47", fillOpacity: 1 }}
        />
      ))}
    </MapContainer>
  );
}
