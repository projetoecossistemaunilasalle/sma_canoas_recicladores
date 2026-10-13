import { apiFetch, ApiError } from "./api";
import type {
  AnnouncementInput,
  Announcement,
  AnnouncementType,
  AuthResponse,
  CollectionRoute,
  Cooperative,
  CooperativeInput,
  CurrentUser,
  FleetVehicle,
  PushSubscriptionInput,
  RegisterInput,
  RouteInput,
  RoutePreviewSegment,
  RouteStop,
  Street,
  UpdateProfileInput,
  Vehicle,
  VehicleInput,
} from "./types";

// Server-only typed wrappers around the backend API (see lib/api.ts).
// Every call but login/register runs as the signed-in user's own token.

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

/** null instead of throwing for a 404 — "there's nothing there" is a normal answer for these. */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---- Auth / profile ----
export function loginUser(email: string, password: string) {
  return apiFetch<AuthResponse>("/login", null, json("POST", { email, password }));
}

export function registerUser(data: RegisterInput) {
  return apiFetch<AuthResponse>("/register", null, json("POST", data));
}

export function updateProfile(token: string, data: UpdateProfileInput) {
  return apiFetch<CurrentUser>("/me", token, json("PUT", data));
}

export function savePushSubscription(token: string, data: PushSubscriptionInput) {
  return apiFetch<void>("/me/push-subscription", token, json("POST", data));
}

/** All of the user's subscriptions, on every device — notifications are off without any. */
export function deletePushSubscriptions(token: string) {
  return apiFetch<void>("/me/push-subscription", token, { method: "DELETE" });
}

// ---- Vehicles ----
export function getVehicles(token: string) {
  return apiFetch<FleetVehicle[]>("/vehicles", token);
}

export function getVehicle(token: string, id: string) {
  return apiFetch<Vehicle>(`/vehicles/${id}`, token);
}

export function createVehicle(token: string, data: VehicleInput) {
  return apiFetch<Vehicle>("/vehicles", token, json("POST", data));
}

export function updateVehicle(token: string, id: string, data: VehicleInput) {
  return apiFetch<Vehicle>(`/vehicles/${id}`, token, json("PUT", data));
}

export function deleteVehicle(token: string, id: string) {
  return apiFetch<void>(`/vehicles/${id}`, token, { method: "DELETE" });
}

/** Lends the vehicle to `cooperativeId`, or — with null — ends its current loan. */
export function setVehicleLoan(token: string, id: string, cooperativeId: string | null, confirmUnlink: boolean) {
  return cooperativeId
    ? apiFetch<Vehicle>(`/vehicles/${id}/loan`, token, json("POST", { cooperativeId, confirmUnlink }))
    : apiFetch<Vehicle>(`/vehicles/${id}/loan/return`, token, json("POST", { confirmUnlink }));
}

// ---- Cooperatives ----
export function getCooperatives(token: string) {
  return apiFetch<Cooperative[]>("/cooperatives", token);
}

export function getCooperative(token: string, id: string) {
  return apiFetch<Cooperative>(`/cooperatives/${id}`, token);
}

export function updateCooperative(token: string, id: string, data: CooperativeInput) {
  return apiFetch<Cooperative>(`/cooperatives/${id}`, token, json("PUT", data));
}

// ---- Announcements ----
export function getAnnouncements(token: string, params?: { type?: AnnouncementType; cooperativeId?: string }) {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.cooperativeId) query.set("cooperativeId", params.cooperativeId);
  const qs = query.toString();
  return apiFetch<Announcement[]>(`/announcements${qs ? `?${qs}` : ""}`, token);
}

export function createAnnouncement(token: string, data: AnnouncementInput) {
  return apiFetch<Announcement>("/announcements", token, json("POST", data));
}

export function updateAnnouncement(token: string, id: string, data: Partial<AnnouncementInput>) {
  return apiFetch<Announcement>(`/announcements/${id}`, token, json("PUT", data));
}

export function deleteAnnouncement(token: string, id: string) {
  return apiFetch<void>(`/announcements/${id}`, token, { method: "DELETE" });
}

// ---- Streets ----
export function getStreet(token: string, id: number) {
  return orNull(apiFetch<Street>(`/streets/${id}`, token));
}

export function getNearestStreet(token: string, lat: number, lng: number) {
  return orNull(apiFetch<Street>(`/streets/nearest?lat=${lat}&lng=${lng}`, token));
}

// ---- Routes ----
export function getRoutes(token: string) {
  return apiFetch<CollectionRoute[]>("/routes", token);
}

export function getRoute(token: string, id: string) {
  return apiFetch<CollectionRoute>(`/routes/${id}`, token);
}

export function getRouteStops(token: string, id: string) {
  return apiFetch<RouteStop[]>(`/routes/${id}/stops`, token);
}

/** Creates (no id) or replaces a route — schedule and stops are saved together, in one transaction. */
export function saveRoute(token: string, id: string | undefined, data: RouteInput) {
  return id
    ? apiFetch<CollectionRoute>(`/routes/${id}`, token, json("PUT", data))
    : apiFetch<CollectionRoute>("/routes", token, json("POST", data));
}

export function deleteRoute(token: string, id: string) {
  return apiFetch<void>(`/routes/${id}`, token, { method: "DELETE" });
}

export async function previewRoute(token: string, streetIds: number[]): Promise<RoutePreviewSegment[] | null> {
  try {
    return await apiFetch<RoutePreviewSegment[]>("/routes/preview", token, json("POST", { streetIds }));
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}
