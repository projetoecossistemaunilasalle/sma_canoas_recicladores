import type { LatLng, LatLngTuple } from "./types";

// Canoas, RS — shared fallback center for the public map.
export const CANOAS_CENTER: [number, number] = [-29.9177, -51.1844];

// Initial great-circle bearing (0-360, 0 = north) from one point to the
// next. There's no heading column on vehicle_positions, so the truck icon's
// rotation is always derived client-side from the last two positions.
export function computeBearing(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ---- Street-segment geometry, for "which side / which stretch" ----
// Lines are [lat, lng][] (how the API sends them). Fractions are planar
// in lng/lat, exactly like PostGIS's ST_LineLocatePoint/ST_LineSubstring on
// SRID 4326 — so a fraction computed here means the same thing as
// route_streets.start_fraction/end_fraction on the backend.

function cumulativeLengths(line: LatLngTuple[]): number[] {
  const cum = [0];
  for (let i = 1; i < line.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  }
  return cum;
}

/** Fraction (0..1) along `line` of the point on it closest to `point`. */
export function locateOnLine(line: LatLngTuple[], point: { lat: number; lng: number }): number {
  if (line.length < 2) return 0;
  const cum = cumulativeLengths(line);
  const total = cum[cum.length - 1];
  if (total === 0) return 0;

  let bestDist = Infinity;
  let bestAlong = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const [aLat, aLng] = line[i];
    const dLat = line[i + 1][0] - aLat;
    const dLng = line[i + 1][1] - aLng;
    const len2 = dLat * dLat + dLng * dLng;
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((point.lat - aLat) * dLat + (point.lng - aLng) * dLng) / len2));
    const dist = Math.hypot(point.lat - (aLat + t * dLat), point.lng - (aLng + t * dLng));
    if (dist < bestDist) {
      bestDist = dist;
      bestAlong = cum[i] + t * Math.sqrt(len2);
    }
  }
  return bestAlong / total;
}

/** Point at fraction `f` (0..1) along `line`. */
export function interpolateOnLine(line: LatLngTuple[], f: number): LatLngTuple {
  if (line.length === 0) return [0, 0];
  if (line.length === 1) return line[0];
  const cum = cumulativeLengths(line);
  const target = Math.min(1, Math.max(0, f)) * cum[cum.length - 1];
  for (let i = 0; i < line.length - 1; i++) {
    if (target <= cum[i + 1] || i === line.length - 2) {
      const segLen = cum[i + 1] - cum[i];
      const t = segLen === 0 ? 0 : (target - cum[i]) / segLen;
      return [line[i][0] + t * (line[i + 1][0] - line[i][0]), line[i][1] + t * (line[i + 1][1] - line[i][1])];
    }
  }
  return line[line.length - 1];
}

/** The stretch of `line` between fractions `from` and `to`. */
export function sliceLine(line: LatLngTuple[], from: number, to: number): LatLngTuple[] {
  if (line.length < 2) return line;
  const cum = cumulativeLengths(line);
  const total = cum[cum.length - 1];
  const start = interpolateOnLine(line, from);
  const end = interpolateOnLine(line, to);
  const inner = line.filter((_, i) => cum[i] > from * total && cum[i] < to * total);
  return [start, ...inner, end];
}

/**
 * `line` shifted `meters` to its left or right, relative to its own
 * direction — for drawing which side of a street is meant. Same left/right
 * convention as street_side() on the backend.
 */
export function offsetLine(line: LatLngTuple[], meters: number, side: "left" | "right"): LatLngTuple[] {
  if (line.length < 2) return line;
  // Local flat frame in meters around the line — plenty accurate at street scale.
  const lat0 = (line[0][0] * Math.PI) / 180;
  const mPerDegLat = 110540;
  const mPerDegLng = 111320 * Math.cos(lat0);
  const pts = line.map(([lat, lng]) => ({ x: lng * mPerDegLng, y: lat * mPerDegLat }));

  // Left-hand unit normal of each segment: direction (dx, dy) → (-dy, dx).
  const normals = pts.slice(1).map((p, i) => {
    const dx = p.x - pts[i].x;
    const dy = p.y - pts[i].y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  });

  const sign = side === "left" ? 1 : -1;
  return pts.map((p, i) => {
    // Interior vertices: average the two adjacent segments' normals.
    const a = normals[Math.max(0, i - 1)];
    const b = normals[Math.min(normals.length - 1, i)];
    const nx = a.x + b.x;
    const ny = a.y + b.y;
    const len = Math.hypot(nx, ny) || 1;
    const x = p.x + (sign * meters * nx) / len;
    const y = p.y + (sign * meters * ny) / len;
    return [y / mPerDegLat, x / mPerDegLng] as LatLngTuple;
  });
}

/** Real length of a [lat, lng][] line in meters. */
export function lineLengthMeters(line: LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    total += distanceMeters(
      { lat: line[i - 1][0], lng: line[i - 1][1] },
      { lat: line[i][0], lng: line[i][1] }
    );
  }
  return total;
}

/** Web Mercator ground resolution — converts an on-screen offset in pixels to meters at a given zoom. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}
