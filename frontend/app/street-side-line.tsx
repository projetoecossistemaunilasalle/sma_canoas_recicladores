"use client";

import { useSyncExternalStore } from "react";
import { Polyline, useMap } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { metersPerPixel, offsetLine, sliceLine } from "@/lib/geo";
import type { CollectionSide, HouseSide, LatLngTuple } from "@/lib/types";

/**
 * Converts an on-screen distance in pixels to meters at the map's current
 * zoom — so a line drawn "beside" a street stays visibly beside it (instead
 * of merging into it when zoomed out, or drifting a block away when zoomed in).
 */
function useScreenOffsetMeters(pixels: number): number {
  const map = useMap();
  // useSyncExternalStore (not useState + an effect-registered listener):
  // sibling effects like FitBounds can change the zoom before this
  // component's own effect subscribes, and that zoomend would be missed —
  // this re-reads the zoom right after subscribing.
  const zoom = useSyncExternalStore(
    (onChange) => {
      map.on("zoomend", onChange);
      return () => {
        map.off("zoomend", onChange);
      };
    },
    () => map.getZoom(),
    () => map.getZoom()
  );

  return pixels * metersPerPixel(map.getCenter().lat, zoom);
}

/**
 * One side (or both, drawn centered) of a stretch of a street segment —
 * the route builder's "this is what gets collected" line and the citizen
 * picker's "your house is on this side" line. Must be rendered inside a
 * react-leaflet MapContainer.
 */
export function StreetSideLine({
  line,
  side,
  startFraction = 0,
  endFraction = 1,
  color,
  weight = 4,
  offsetPx = 7,
  onClick,
}: {
  /** The whole segment, [lat, lng][] in its own geometry direction. */
  line: LatLngTuple[];
  side: CollectionSide;
  startFraction?: number;
  endFraction?: number;
  color: string;
  weight?: number;
  offsetPx?: number;
  onClick?: (e: LeafletMouseEvent) => void;
}) {
  const offsetMeters = useScreenOffsetMeters(offsetPx);
  const stretch = sliceLine(line, startFraction, endFraction);
  const positions = side === "both" ? stretch : offsetLine(stretch, offsetMeters, side);

  return (
    <Polyline
      positions={positions}
      pathOptions={{ color, weight, opacity: 0.95, lineCap: "round" }}
      eventHandlers={onClick ? { click: onClick } : undefined}
    />
  );
}

const HOUSE_SIDE_COLOR = "#6A2C91";

/**
 * The citizen picker's "your house is on this side of this block" — the
 * block itself faintly, plus a solid line along the chosen side. With no
 * side yet (pin on the centerline), just the block.
 */
export function HouseSideHighlight({ line, side }: { line: LatLngTuple[]; side: HouseSide | null }) {
  return (
    <>
      <Polyline positions={line} pathOptions={{ color: HOUSE_SIDE_COLOR, weight: 6, opacity: 0.25 }} interactive={false} />
      {side ? <StreetSideLine line={line} side={side} color={HOUSE_SIDE_COLOR} weight={5} offsetPx={9} /> : null}
    </>
  );
}
