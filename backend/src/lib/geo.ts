// Mirrors frontend/lib/format.ts:parseWktPoint — the backend only ever gets
// WKT text back from PostGIS columns (via ST_AsText, see positionColumns in
// vehicle.service.ts), never a {lat,lng} object directly.
export function parseWktPoint(wkt: string): { lat: number; lng: number } | null {
  const match = /POINT\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i.exec(wkt)
  if (!match) return null
  const [, lng, lat] = match
  return { lat: Number(lat), lng: Number(lng) }
}
