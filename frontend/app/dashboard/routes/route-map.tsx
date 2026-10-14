"use client";

import { useEffect, useRef } from "react";
import { Marker, Pane, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { BaseMap } from "@/app/base-map";
import { computeBearing, distanceMeters, interpolateOnLine, lineLengthMeters, locateOnLine, sliceLine } from "@/lib/geo";
import { arrowDivIcon } from "@/lib/map-icons";
import { StreetSideLine } from "@/app/street-side-line";
import { ROUTE_COLORS } from "./route-style";
import type { CollectionSide, LatLngTuple } from "@/lib/types";

const DRAG_SAMPLE_MS = 220;
// Smallest stretch a stop can be cut down to, as a fraction of the segment —
// keeps the two handles from crossing over each other.
const MIN_STRETCH = 0.02;
// A pass-through street shorter than this gets no direction arrow: on a
// short block the arrow would just cover the line.
const MIN_ARROW_SEGMENT_M = 60;
// A collected stretch needs this much room for its two arrows plus the
// stop number between them (the selected stop always gets them).
const MIN_STOP_ARROWS_M = 70;
// Start and end pins closer than this (a route that loops back) become one.
const SAME_PLACE_M = 25;

// Every icon below goes through this: the markers re-render on each drag
// sample, and a fresh L.divIcon would make Leaflet rebuild its DOM every time.
const iconCache = new Map<string, L.DivIcon>();
function cachedIcon(key: string, make: () => L.DivIcon): L.DivIcon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = make();
    iconCache.set(key, icon);
  }
  return icon;
}

const handleIcon = L.divIcon({
  className: "route-marker",
  html: `<div style="width:22px;height:22px;box-sizing:border-box;border-radius:50%;background:#fff;border:4px solid ${ROUTE_COLORS.collect};box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:grab;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** White arrow outlined in the line's color — readable on top of that same line. */
function arrowIcon(heading: number, color: string, size: number) {
  const h = Math.round(heading);
  return cachedIcon(`arrow-${color}-${size}-${h}`, () => arrowDivIcon(h, color, size, "route-marker"));
}

/** A stop's number, in the same disc the side panel's list uses. */
function stopIcon(n: number, selected: boolean) {
  return cachedIcon(`stop-${n}-${selected}`, () => {
    const size = selected ? 34 : 28;
    const fill = selected ? ROUTE_COLORS.collect : "#ffffff";
    const text = selected ? "#ffffff" : "#1f1720";
    return L.divIcon({
      className: "route-marker",
      html: `<div style="width:${size}px;height:${size}px;box-sizing:border-box;border-radius:50%;background:${fill};border:3px solid ${ROUTE_COLORS.collect};box-shadow:0 1px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font:700 ${selected ? 15 : 13}px/1 Inter,sans-serif;color:${text};">${n}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  });
}

type PinKind = "start" | "end" | "both";

const PINS: Record<PinKind, { color: string; icon: string; label: string }> = {
  start: { color: ROUTE_COLORS.start, icon: "play_arrow", label: "Início" },
  end: { color: ROUTE_COLORS.end, icon: "sports_score", label: "Fim" },
  both: { color: ROUTE_COLORS.start, icon: "flag", label: "Início e fim" },
};

/** A labelled flag standing on the point (the dot at its foot is the exact spot). */
function pinIcon(kind: PinKind) {
  return cachedIcon(`pin-${kind}`, () => {
    const { color, icon, label } = PINS[kind];
    return L.divIcon({
      className: "route-marker",
      html: `<div style="position:absolute;left:0;top:0;transform:translate(-50%,calc(-100% + 7px));display:flex;flex-direction:column;align-items:center;">
        <div style="display:flex;align-items:center;gap:2px;white-space:nowrap;background:${color};color:#fff;font:700 13px/1 Inter,sans-serif;padding:5px 10px 5px 6px;border-radius:999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
          <span class="material-symbols-outlined" style="font-size:18px;line-height:1;">${icon}</span>${label}
        </div>
        <div style="width:3px;height:10px;background:${color};"></div>
        <div style="width:14px;height:14px;box-sizing:border-box;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  });
}

export interface RouteMapStop {
  line: LatLngTuple[];
  side: CollectionSide;
  startFraction: number;
  endFraction: number;
}

export interface RouteMapSegment {
  /** In the direction the truck drives it. */
  line: LatLngTuple[];
  isStop: boolean;
}

function toLatLng([lat, lng]: LatLngTuple) {
  return { lat, lng };
}

/** Direction of travel at fraction `f` along a line drawn in driving order. */
function headingAt(line: LatLngTuple[], f: number) {
  return computeBearing(
    toLatLng(interpolateOnLine(line, Math.max(0, f - 0.02))),
    toLatLng(interpolateOnLine(line, Math.min(1, f + 0.02)))
  );
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
    map.fitBounds(L.latLngBounds(allPoints), { padding: [48, 48] });
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
 * collected stretch (dragged along the street to cut it), and the parts
 * left out drawn dashed.
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
  function dragTo(which: "start" | "end", latlng: L.LatLng) {
    const f = locateOnLine(line, latlng);
    if (which === "start") onChange(Math.min(f, endFraction - MIN_STRETCH), endFraction);
    else onChange(startFraction, Math.max(f, startFraction + MIN_STRETCH));
  }

  const leftOut = { color: ROUTE_COLORS.collect, weight: 3, dashArray: "2 8", opacity: 0.9 };

  return (
    <>
      {/* Above the driven path, which runs along the parts left out. */}
      <Pane name="route-edit" style={{ zIndex: 430 }}>
        {startFraction > 0 ? <Polyline positions={sliceLine(line, 0, startFraction)} pathOptions={leftOut} /> : null}
        {endFraction < 1 ? <Polyline positions={sliceLine(line, endFraction, 1)} pathOptions={leftOut} /> : null}
      </Pane>
      <Marker
        position={interpolateOnLine(line, startFraction)}
        icon={handleIcon}
        draggable
        zIndexOffset={2000}
        eventHandlers={{ drag: (e) => dragTo("start", (e.target as L.Marker).getLatLng()) }}
      />
      <Marker
        position={interpolateOnLine(line, endFraction)}
        icon={handleIcon}
        draggable
        zIndexOffset={2000}
        eventHandlers={{ drag: (e) => dragTo("end", (e.target as L.Marker).getLatLng()) }}
      />
    </>
  );
}

export function RouteMap({
  path,
  stops,
  selectedStop = null,
  onSelectStop,
  onStretchChange,
  drawMode = false,
  onPoint,
}: {
  /** Full connected path (stops + auto-filled connectors), in driving order. */
  path: RouteMapSegment[];
  /** The streets the user picked as stops, with what's collected on each. */
  stops: RouteMapStop[];
  selectedStop?: number | null;
  onSelectStop?: (index: number) => void;
  onStretchChange?: (index: number, startFraction: number, endFraction: number) => void;
  drawMode?: boolean;
  onPoint?: (lat: number, lng: number) => void;
}) {
  const selected = selectedStop != null ? stops[selectedStop] : undefined;
  const canSelect = !drawMode && !!onSelectStop;

  // Every stop is driven in its own geometry direction, so the truck starts
  // at the first point of the first stop and ends at the last point of the last.
  const firstLine = stops[0]?.line;
  const lastLine = stops[stops.length - 1]?.line;
  const startPos = firstLine?.[0];
  const endPos = lastLine?.[lastLine.length - 1];
  const loops = !!startPos && !!endPos && distanceMeters(toLatLng(startPos), toLatLng(endPos)) < SAME_PLACE_M;

  const passArrows = path
    .filter((seg) => !seg.isStop && seg.line.length > 1 && lineLengthMeters(seg.line) >= MIN_ARROW_SEGMENT_M)
    .map((seg) => ({ position: interpolateOnLine(seg.line, 0.5), heading: headingAt(seg.line, 0.5) }));

  // Two arrows on each collected stretch, either side of its number: the
  // driving direction is what the stop's "left"/"right" side means.
  const collectArrows = stops.flatMap((stop, i) => {
    const span = stop.endFraction - stop.startFraction;
    if (i !== selectedStop && span * lineLengthMeters(stop.line) < MIN_STOP_ARROWS_M) return [];
    return [0.2, 0.8].map((t) => {
      const f = stop.startFraction + span * t;
      return { position: interpolateOnLine(stop.line, f), heading: headingAt(stop.line, f), big: i === selectedStop };
    });
  });

  return (
    <BaseMap
      scrollWheelZoom={false}
      className={`w-full h-full min-h-64 rounded-2xl z-0 ${drawMode ? "cursor-crosshair" : ""}`}
    >
      <FitBounds segments={path.length > 0 ? path.map((s) => s.line) : stops.map((s) => s.line)} />
      <FocusStop line={selected?.line ?? null} />
      {onPoint ? <DrawHandler drawMode={drawMode} onPoint={onPoint} /> : null}

      {/* Panes pin the stacking order: the driven path stays under the
          collected streets even when it's redrawn after them. */}
      <Pane name="route-pass" style={{ zIndex: 410 }}>
        {path.map((seg, i) => (
          <Polyline
            key={`casing-${i}`}
            positions={seg.line}
            pathOptions={{ color: ROUTE_COLORS.casing, weight: 9, opacity: 0.9 }}
            interactive={false}
          />
        ))}
        {path.map((seg, i) => (
          <Polyline
            key={`line-${i}`}
            positions={seg.line}
            pathOptions={{ color: ROUTE_COLORS.pass, weight: 5, lineCap: "round" }}
            interactive={false}
          />
        ))}
      </Pane>

      <Pane name="route-collect" style={{ zIndex: 420 }}>
        {stops.map((stop, i) => (
          <StreetSideLine
            key={`casing-${i}`}
            line={stop.line}
            side={stop.side}
            startFraction={stop.startFraction}
            endFraction={stop.endFraction}
            color={ROUTE_COLORS.casing}
            weight={i === selectedStop ? 12 : 10}
            onClick={canSelect ? () => onSelectStop(i) : undefined}
          />
        ))}
        {stops.map((stop, i) => (
          <StreetSideLine
            key={`line-${i}`}
            line={stop.line}
            side={stop.side}
            startFraction={stop.startFraction}
            endFraction={stop.endFraction}
            color={ROUTE_COLORS.collect}
            weight={i === selectedStop ? 8 : 6}
            onClick={canSelect ? () => onSelectStop(i) : undefined}
          />
        ))}
      </Pane>

      {passArrows.map((arrow, i) => (
        <Marker
          key={`pass-arrow-${i}`}
          position={arrow.position}
          icon={arrowIcon(arrow.heading, ROUTE_COLORS.pass, 16)}
          interactive={false}
        />
      ))}
      {collectArrows.map((arrow, i) => (
        <Marker
          key={`collect-arrow-${i}`}
          position={arrow.position}
          icon={arrowIcon(arrow.heading, ROUTE_COLORS.collect, arrow.big ? 22 : 18)}
          interactive={false}
        />
      ))}

      {stops.map((stop, i) => (
        <Marker
          // `interactive` is only read when the marker is created — remount
          // on mode change so drawing clicks go through to the map.
          key={`stop-${i}-${canSelect}`}
          position={interpolateOnLine(stop.line, (stop.startFraction + stop.endFraction) / 2)}
          icon={stopIcon(i + 1, i === selectedStop)}
          interactive={canSelect}
          zIndexOffset={i === selectedStop ? 1500 : 500}
          eventHandlers={canSelect ? { click: () => onSelectStop(i) } : undefined}
          title={`Parada ${i + 1}`}
        />
      ))}

      {loops && startPos ? (
        <Marker position={startPos} icon={pinIcon("both")} interactive={false} zIndexOffset={1000} />
      ) : (
        <>
          {startPos ? <Marker position={startPos} icon={pinIcon("start")} interactive={false} zIndexOffset={1000} /> : null}
          {endPos && stops.length > 0 ? (
            <Marker position={endPos} icon={pinIcon("end")} interactive={false} zIndexOffset={1000} />
          ) : null}
        </>
      )}

      {selected && onStretchChange && selectedStop != null ? (
        <StretchEditor
          line={selected.line}
          startFraction={selected.startFraction}
          endFraction={selected.endFraction}
          onChange={(start, end) => onStretchChange(selectedStop, start, end)}
        />
      ) : null}
    </BaseMap>
  );
}
