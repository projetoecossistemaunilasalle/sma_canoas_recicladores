"use client";

import { useEffect, useRef } from "react";
import { Polyline, CircleMarker, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { BaseMap } from "@/app/base-map";
import { computeBearing, interpolateOnLine, locateOnLine, sliceLine } from "@/lib/geo";
import { arrowDivIcon } from "@/lib/map-icons";
import { StreetSideLine } from "@/app/street-side-line";
import type { CollectionSide, LatLngTuple } from "@/lib/types";

const DRAG_SAMPLE_MS = 220;
const PATH_COLOR = "#006b47";
const COLLECTED_COLOR = "#e07b00";
// Smallest stretch a stop can be cut down to, as a fraction of the segment —
// keeps the two handles from crossing over each other.
const MIN_STRETCH = 0.02;

const handleIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid ${COLLECTED_COLOR};box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:grab;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export interface RouteMapStop {
  line: LatLngTuple[];
  side: CollectionSide;
  startFraction: number;
  endFraction: number;
}

function FitBounds({ segments }: { segments: LatLngTuple[][] }) {
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

/** Zooms onto a stop when it gets selected for editing, so its handles are big enough to drag. */
function FocusStop({ line }: { line: LatLngTuple[] | null }) {
  const map = useMap();
  const key = line ? `${line[0]}-${line[line.length - 1]}` : null;

  useEffect(() => {
    if (!line || line.length === 0) return;
    map.fitBounds(L.latLngBounds(line), { padding: [80, 80], maxZoom: 18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

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

/**
 * The selected stop's editing affordances: a handle at each end of the
 * collected stretch (dragged along the street to cut it), the parts left
 * out drawn dashed, and an arrow showing the direction the truck drives it
 * — "left"/"right" are from the driver's seat going that way.
 */
function StretchEditor({
  line,
  startFraction,
  endFraction,
  onChange,
}: {
  line: LatLngTuple[];
  startFraction: number;
  endFraction: number;
  onChange: (startFraction: number, endFraction: number) => void;
}) {
  const mid = (startFraction + endFraction) / 2;
  const heading = computeBearing(
    toLatLng(interpolateOnLine(line, Math.max(0, mid - 0.02))),
    toLatLng(interpolateOnLine(line, Math.min(1, mid + 0.02)))
  );

  function dragTo(which: "start" | "end", latlng: L.LatLng) {
    const f = locateOnLine(line, latlng);
    if (which === "start") onChange(Math.min(f, endFraction - MIN_STRETCH), endFraction);
    else onChange(startFraction, Math.max(f, startFraction + MIN_STRETCH));
  }

  return (
    <>
      {startFraction > 0 ? (
        <Polyline
          positions={sliceLine(line, 0, startFraction)}
          pathOptions={{ color: "#ffffff", weight: 3, dashArray: "4 6" }}
        />
      ) : null}
      {endFraction < 1 ? (
        <Polyline
          positions={sliceLine(line, endFraction, 1)}
          pathOptions={{ color: "#ffffff", weight: 3, dashArray: "4 6" }}
        />
      ) : null}
      <Marker position={interpolateOnLine(line, mid)} icon={arrowDivIcon(heading, COLLECTED_COLOR, 22)} interactive={false} />
      <Marker
        position={interpolateOnLine(line, startFraction)}
        icon={handleIcon}
        draggable
        eventHandlers={{ drag: (e) => dragTo("start", (e.target as L.Marker).getLatLng()) }}
      />
      <Marker
        position={interpolateOnLine(line, endFraction)}
        icon={handleIcon}
        draggable
        eventHandlers={{ drag: (e) => dragTo("end", (e.target as L.Marker).getLatLng()) }}
      />
    </>
  );
}

function toLatLng([lat, lng]: LatLngTuple) {
  return { lat, lng };
}

export function RouteMap({
  pathLines,
  stops,
  selectedStop = null,
  onSelectStop,
  onStretchChange,
  drawMode = false,
  onPoint,
}: {
  /** Full connected path (stops + auto-filled connectors) — drawn as the route line. */
  pathLines: LatLngTuple[][];
  /** The streets the user picked as stops, with what's collected on each — drawn on top in orange. */
  stops: RouteMapStop[];
  selectedStop?: number | null;
  onSelectStop?: (index: number) => void;
  onStretchChange?: (index: number, startFraction: number, endFraction: number) => void;
  drawMode?: boolean;
  onPoint?: (lat: number, lng: number) => void;
}) {
  const stopLines = stops.map((s) => s.line);
  const stopPoints = stopLines.map((line) => line[0]).filter(Boolean);
  const selected = selectedStop != null ? stops[selectedStop] : undefined;
  const selectedLine = selectedStop != null ? stopLines[selectedStop] : null;

  return (
    <BaseMap
      scrollWheelZoom={false}
      className={`w-full h-full min-h-64 rounded-xl z-0 ${drawMode ? "cursor-crosshair" : ""}`}
    >
      <FitBounds segments={pathLines.length > 0 ? pathLines : stopPoints.map((p) => [p])} />
      <FocusStop line={selectedLine} />
      {onPoint ? <DrawHandler drawMode={drawMode} onPoint={onPoint} /> : null}
      {pathLines.map((positions, i) => (
        <Polyline key={i} positions={positions} pathOptions={{ color: PATH_COLOR, weight: 5 }} />
      ))}
      {stops.map((stop, i) => (
        <StreetSideLine
          key={i}
          line={stopLines[i]}
          side={stop.side}
          startFraction={stop.startFraction}
          endFraction={stop.endFraction}
          color={COLLECTED_COLOR}
          weight={i === selectedStop ? 6 : 4}
          onClick={drawMode || !onSelectStop ? undefined : () => onSelectStop(i)}
        />
      ))}
      {stopPoints.map((pos, i) => (
        <CircleMarker
          key={i}
          center={pos}
          radius={7}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: PATH_COLOR, fillOpacity: 1 }}
        />
      ))}
      {selected && selectedLine && onStretchChange && selectedStop != null ? (
        <StretchEditor
          line={selectedLine}
          startFraction={selected.startFraction}
          endFraction={selected.endFraction}
          onChange={(start, end) => onStretchChange(selectedStop, start, end)}
        />
      ) : null}
    </BaseMap>
  );
}
