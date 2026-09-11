import type { CollectionCheckResult, GeocodeResult, PublicCooperativeSummary } from "./types";

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

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  if (query.trim().length < 3) return [];
  return publicFetch<GeocodeResult[]>(`/public/geocode?q=${encodeURIComponent(query)}`);
}

export async function checkCollectionForAddress(
  lat: number,
  lng: number
): Promise<CollectionCheckResult> {
  return publicFetch<CollectionCheckResult>(`/public/collection-check?lat=${lat}&lng=${lng}`);
}

export async function getPublicCooperatives(): Promise<PublicCooperativeSummary[]> {
  return publicFetch<PublicCooperativeSummary[]>("/public/cooperatives");
}
