import type {
  AddressPoint,
  AddressStreet,
  CollectionCheckResult,
  GeocodeResult,
  PublicCooperativeSummary,
} from "./types";

// Client-side fetches for the anonymous public home — deliberately separate
// from lib/api.ts/data.ts, which are server-only and always require a JWT.
// These hit the backend's public/* routes through the existing /api rewrite
// (see next.config.ts), so no token and no BACKEND_URL exposure is needed.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** An announcement image (public; each id's bytes never change, so the browser caches it for good). */
export function announcementImageUrl(id: string): string {
  return `${API_BASE}/announcement-images/${id}`;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 3) return [];
  return publicFetch<GeocodeResult[]>(`/public/geocode?q=${encodeURIComponent(query)}`);
}

/** Which segment (and suggested side) a house pin sits on; null when there's no street nearby. */
export async function resolveAddressStreet(
  lat: number,
  lng: number,
  road: string | null
): Promise<AddressStreet | null> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (road) params.set("road", road);
  const res = await fetch(`${API_BASE}/public/address-street?${params}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<AddressStreet>;
}

export async function checkCollectionForAddress(point: AddressPoint): Promise<CollectionCheckResult> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lng: String(point.lng),
    streetId: String(point.streetId),
    side: point.side,
  });
  return publicFetch<CollectionCheckResult>(`/public/collection-check?${params}`);
}

export async function getPublicCooperatives(): Promise<PublicCooperativeSummary[]> {
  return publicFetch<PublicCooperativeSummary[]>("/public/cooperatives");
}
