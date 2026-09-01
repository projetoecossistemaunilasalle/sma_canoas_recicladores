import { apiFetch, ApiError } from "./api";
import type {
  Cooperative,
  Vehicle,
  VehiclePosition,
  CollectionRoute,
  Street,
  RouteStreet,
  RouteStop,
  RoutePreviewSegment,
  CurrentUser,
} from "./types";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  address?: string;
  lat?: number;
  lng?: number;
}

// Unlike every other function in this file, registration has no token yet —
// it's the one public/anonymous write in this server-only module.
export async function registerUser(data: RegisterInput) {
  const res = await fetch(`${BACKEND_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}) as { message?: string });
  if (!res.ok) throw new ApiError(res.status, body.message ?? res.statusText);
  return body as { token: string; user: CurrentUser };
}

export interface UpdateProfileInput {
  name?: string;
  password?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notifyProximity?: boolean;
}

export function updateProfile(token: string, data: UpdateProfileInput) {
  return apiFetch<CurrentUser>("/me", token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function savePushSubscription(token: string, data: PushSubscriptionInput) {
  return apiFetch<void>("/me/push-subscription", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deletePushSubscription(token: string, endpoint: string) {
  return apiFetch<void>("/me/push-subscription", token, {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export function getVehicles(token: string) {
  return apiFetch<Vehicle[]>("/vehicles", token);
}

export function getVehicle(token: string, id: string) {
  return apiFetch<Vehicle>(`/vehicles/${id}`, token);
}

export interface VehicleInput {
  plate?: string;
  model?: string;
  color?: string;
  type?: string;
  cooperativeId?: string;
  active?: boolean;
}

export function createVehicle(token: string, data: VehicleInput) {
  return apiFetch<Vehicle>("/vehicles", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateVehicle(token: string, id: string, data: VehicleInput) {
  return apiFetch<Vehicle>(`/vehicles/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteVehicle(token: string, id: string) {
  return apiFetch<void>(`/vehicles/${id}`, token, { method: "DELETE" });
}

export function loanVehicle(token: string, id: string, cooperativeId: string, confirmUnlink = false) {
  return apiFetch<Vehicle>(`/vehicles/${id}/loan`, token, {
    method: "POST",
    body: JSON.stringify({ cooperativeId, confirmUnlink }),
  });
}

export function returnVehicleLoan(token: string, id: string, confirmUnlink = false) {
  return apiFetch<Vehicle>(`/vehicles/${id}/loan/return`, token, {
    method: "POST",
    body: JSON.stringify({ confirmUnlink }),
  });
}

export function getCooperatives(token: string) {
  return apiFetch<Cooperative[]>("/cooperatives", token);
}

export function getRoutes(token: string) {
  return apiFetch<CollectionRoute[]>("/routes", token);
}

export function getRoute(token: string, id: string) {
  return apiFetch<CollectionRoute>(`/routes/${id}`, token);
}

export function getRouteStops(token: string, id: string) {
  return apiFetch<RouteStop[]>(`/routes/${id}/stops`, token);
}

export function deleteRoute(token: string, id: string) {
  return apiFetch<void>(`/routes/${id}`, token, { method: "DELETE" });
}

export function getCooperative(token: string, id: string) {
  return apiFetch<Cooperative>(`/cooperatives/${id}`, token);
}

export async function getLatestPosition(
  token: string,
  vehicleId: string
): Promise<VehiclePosition | null> {
  try {
    return await apiFetch<VehiclePosition>(
      `/vehicles/${vehicleId}/positions/latest`,
      token
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}


export async function getNearestStreet(
  token: string,
  lat: number,
  lng: number
): Promise<Street | null> {
  try {
    return await apiFetch<Street>(`/streets/nearest?lat=${lat}&lng=${lng}`, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export function createRoute(
  token: string,
  data: {
    vehicleId: string;
    status?: string;
    daysOfWeek: string[];
    shift: string;
    startTime: string;
  }
) {
  return apiFetch<CollectionRoute>("/routes", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRoute(
  token: string,
  id: string,
  data: { vehicleId: string; daysOfWeek: string[]; shift: string; startTime: string }
) {
  return apiFetch<CollectionRoute>(`/routes/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function planRoute(token: string, routeId: string, streetIds: number[]) {
  return apiFetch<RouteStreet[]>(`/routes/${routeId}/plan`, token, {
    method: "POST",
    body: JSON.stringify({ streetIds }),
  });
}

export async function previewRoute(
  token: string,
  streetIds: number[]
): Promise<RoutePreviewSegment[] | null> {
  try {
    return await apiFetch<RoutePreviewSegment[]>("/routes/preview", token, {
      method: "POST",
      body: JSON.stringify({ streetIds }),
    });
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}
