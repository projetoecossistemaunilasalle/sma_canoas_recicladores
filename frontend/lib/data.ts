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
  EtaResult,
} from "./types";

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

export function searchStreets(token: string, search: string) {
  const query = search ? `?search=${encodeURIComponent(search)}&limit=20` : "?limit=20";
  return apiFetch<Street[]>(`/streets${query}`, token);
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

export async function getEta(
  token: string,
  vehicleId: string,
  lat: number,
  lng: number
): Promise<EtaResult | null> {
  try {
    return await apiFetch<EtaResult>(
      `/vehicles/${vehicleId}/eta?lat=${lat}&lng=${lng}`,
      token
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
