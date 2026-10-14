import type { paths } from "./api-types";

// ---- Backend API shapes ----
// Straight from the backend's OpenAPI document — lib/api-types.ts is
// generated (`pnpm openapi` in backend/, then `npm run api:types` here), so
// these can't drift from what the API actually sends and accepts.

type JsonOf<T> = T extends { content: { "application/json": infer Body } } ? Body : never;
type ApiResponse<P extends keyof paths, M extends keyof paths[P], Status extends number = 200> =
  paths[P][M] extends { responses: infer R } ? (Status extends keyof R ? JsonOf<R[Status]> : never) : never;
type ApiBody<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { requestBody?: infer B } ? JsonOf<NonNullable<B>> : never;

export type CurrentUser = ApiResponse<"/me", "get">;
export type UpdateProfileInput = ApiBody<"/me", "put">;
export type AuthResponse = ApiResponse<"/login", "post">;
export type PushSubscriptionInput = ApiBody<"/me/push-subscription", "post">;

export type Cooperative = ApiResponse<"/cooperatives/{id}", "get">;
export type CooperativeInput = ApiBody<"/cooperatives/{id}", "put">;
export type PublicCooperativeSummary = ApiResponse<"/public/cooperatives", "get">[number];

export type Announcement = ApiResponse<"/announcements", "get">[number];
export type AnnouncementType = Announcement["type"];
export type AnnouncementInput = ApiBody<"/announcements", "post">;

export type Vehicle = ApiResponse<"/vehicles/{id}", "get">;
/** A vehicle as the fleet list returns it — with its latest GPS fix. */
export type FleetVehicle = ApiResponse<"/vehicles", "get">[number];
export type VehicleType = Vehicle["type"];
export type VehicleInput = ApiBody<"/vehicles", "post">;
/** A route still using a vehicle that's being lent or returned (the 409 body). */
export type ConflictingRoute = ApiResponse<"/vehicles/{id}/loan", "post", 409>["routes"][number];

export type CollectionRoute = ApiResponse<"/routes/{id}", "get">;
export type DayOfWeek = NonNullable<CollectionRoute["daysOfWeek"]>[number];
export type Shift = NonNullable<CollectionRoute["shift"]>;
export type RouteInput = ApiBody<"/routes", "post">;
export type RouteStopInput = Required<RouteInput["stops"][number]>;
export type RouteStop = ApiResponse<"/routes/{id}/stops", "get">[number];
export type RoutePreviewSegment = ApiResponse<"/routes/preview", "post">[number];
export type Street = ApiResponse<"/streets/{id}", "get">;
/** Which side of a stop a route collects — relative to the segment's own direction (source→target). */
export type CollectionSide = RouteStop["side"];

/** A street from /public/geocode (street-level only — no house numbers). */
export type GeocodeResult = ApiResponse<"/public/geocode", "get">[number];
/** The segment a house pin sits on. `side` is only a suggestion (null = pin on the centerline). */
export type AddressStreet = ApiResponse<"/public/address-street", "get">;
/** Which side of a segment a citizen's house is on. */
export type HouseSide = NonNullable<AddressStreet["side"]>;
export type CollectionCheckResult = ApiResponse<"/public/collection-check", "get">;
export type PublicVehicleSummary = Extract<CollectionCheckResult, { status: "scheduled_today" }>["vehicle"];

// ---- Frontend-only shapes ----

export interface LatLng {
  lat: number;
  lng: number;
}

/** A point as [lat, lng] — Leaflet's order, and how the API sends street lines. */
export type LatLngTuple = [number, number];

/** A house pin plus the segment and side the citizen confirmed for it — what collection checks run on. */
export interface AddressPoint {
  lat: number;
  lng: number;
  streetId: number;
  side: HouseSide;
}

/** Everything the address picker collects for a citizen's address. */
export interface CitizenAddress extends AddressPoint {
  label: string;
  number: string | null;
  streetName: string | null;
  streetLine: LatLngTuple[];
}
