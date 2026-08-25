import { apiFetch, ApiError } from "./api";

import type {
  CurrentUser,
  Cooperative,
  Vehicle,
  VehiclePosition,
  CollectionRoute,
  Street,
  RouteStreet,
  RouteStop,
  RoutePreviewSegment,
  EtaResult,
  Publication,
} from "./types";

export function getVehicles(token: string) {
  return apiFetch<Vehicle[]>("/vehicles", token);
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
  return apiFetch<void>(`/routes/${id}`, token, {
    method: "DELETE",
  });
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
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

export function searchStreets(token: string, search: string) {
  const query = search
    ? `?search=${encodeURIComponent(search)}&limit=20`
    : "?limit=20";

  return apiFetch<Street[]>(`/streets${query}`, token);
}

export async function getNearestStreet(
  token: string,
  lat: number,
  lng: number
): Promise<Street | null> {
  try {
    return await apiFetch<Street>(
      `/streets/nearest?lat=${lat}&lng=${lng}`,
      token
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

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
  data: {
    vehicleId: string;
    daysOfWeek: string[];
    shift: string;
    startTime: string;
  }
) {
  return apiFetch<CollectionRoute>(`/routes/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function planRoute(
  token: string,
  routeId: string,
  streetIds: number[]
) {
  return apiFetch<RouteStreet[]>(
    `/routes/${routeId}/plan`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ streetIds }),
    }
  );
}

export async function previewRoute(
  token: string,
  streetIds: number[]
): Promise<RoutePreviewSegment[] | null> {
  try {
    return await apiFetch<RoutePreviewSegment[]>(
      "/routes/preview",
      token,
      {
        method: "POST",
        body: JSON.stringify({ streetIds }),
      }
    );
  } catch (err) {
    if (err instanceof ApiError) {
      return null;
    }

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
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

/* =========================
   PUBLICAÇÕES
   ========================= */

export function getPublications(token: string) {
  return apiFetch<Publication[]>("/publications", token);
}

export function getPublication(
  token: string,
  id: string
) {
  return apiFetch<Publication>(
    `/publications/${id}`,
    token
  );
}

/**
 * Dados utilizados para criar uma publicação.
 *
 * Os campos abaixo correspondem aos campos existentes
 * na tabela publications do banco.
 */
export interface CreatePublicationData {
  title: string;
  content: string;
  imageUrl?: string | null;
  cooperativeId?: string;

  address?: string | null;
  phone?: string | null;

  weekdayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;

  importantPhotoUrl?: string | null;
  importantPhotoDescription?: string | null;

  updatedPhotoUrl?: string | null;
  updatedPhotoDescription?: string | null;

  photoUpdatedAt?: string | null;
}

/**
 * Cria uma nova publicação.
 */
export function createPublication(
  token: string,
  data: CreatePublicationData
) {
  return apiFetch<Publication>("/publications", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Dados utilizados para atualizar uma publicação.
 */
export interface UpdatePublicationData {
  title?: string;
  content?: string;
  imageUrl?: string | null;

  address?: string | null;
  phone?: string | null;

  weekdayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;

  importantPhotoUrl?: string | null;
  importantPhotoDescription?: string | null;

  updatedPhotoUrl?: string | null;
  updatedPhotoDescription?: string | null;

  photoUpdatedAt?: string | null;
}

/**
 * Atualiza os dados de uma publicação.
 */
export function updatePublication(
  token: string,
  id: string,
  data: UpdatePublicationData
) {
  return apiFetch<Publication>(
    `/publications/${id}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Altera o status da publicação.
 *
 * DRAFT      = Rascunho
 * PUBLISHED  = Publicado
 * ARCHIVED   = Arquivado
 */
export function updatePublicationStatus(
  token: string,
  id: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
) {
  return apiFetch<Publication>(
    `/publications/${id}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

/**
 * Exclui uma publicação.
 */
export function deletePublication(
  token: string,
  id: string
) {
  return apiFetch<void>(
    `/publications/${id}`,
    token,
    {
      method: "DELETE",
    }
  );
}

/* =========================
   USUÁRIO
   ========================= */

export function updateUser(
  token: string,
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    address?: string;
  }
) {
  return apiFetch<CurrentUser>(
    `/users/${id}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}