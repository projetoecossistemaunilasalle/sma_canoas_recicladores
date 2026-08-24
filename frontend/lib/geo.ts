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
