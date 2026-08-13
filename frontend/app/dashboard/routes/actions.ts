"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { getNearestStreet, createRoute, updateRoute, planRoute, previewRoute, deleteRoute } from "@/lib/data";
import { ApiError } from "@/lib/api";
import type { Street, RoutePreviewSegment } from "@/lib/types";

export async function pickStreetAction(lat: number, lng: number): Promise<Street | null> {
  const token = await getToken();
  if (!token) return null;
  return getNearestStreet(token, lat, lng);
}

export async function previewRouteAction(streetIds: number[]): Promise<RoutePreviewSegment[] | null> {
  const token = await getToken();
  if (!token) return null;
  if (streetIds.length === 0) return [];
  return previewRoute(token, streetIds);
}

export interface CreateRouteState {
  error?: string;
}

/**
 * Bound with a routeId (from the edit page) or undefined (from the "new
 * route" page) before being handed to useActionState — see RouteBuilder.
 */
export async function createAndPlanRoute(
  routeId: string | undefined,
  _prevState: CreateRouteState,
  formData: FormData
): Promise<CreateRouteState> {
  const token = await getToken();
  if (!token) redirect("/login");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const shift = String(formData.get("shift") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const daysOfWeek = formData.getAll("daysOfWeek").map(String);
  const streetIdsRaw = String(formData.get("streetIds") ?? "");

  if (!vehicleId) return { error: "Selecione um veículo." };
  if (daysOfWeek.length === 0) return { error: "Selecione ao menos um dia da semana." };
  if (!shift) return { error: "Selecione o turno." };
  if (!startTime) return { error: "Informe o horário de início." };

  const streetIds = streetIdsRaw
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  if (streetIds.length === 0) {
    return { error: "Desenhe a rota no mapa, clicando/arrastando sobre as ruas, em ordem." };
  }

  try {
    let finalRouteId = routeId;
    if (finalRouteId) {
      await updateRoute(token, finalRouteId, { vehicleId, daysOfWeek, shift, startTime });
    } else {
      const route = await createRoute(token, { vehicleId, status: "active", daysOfWeek, shift, startTime });
      finalRouteId = route.id;
    }
    await planRoute(token, finalRouteId, streetIds);
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Não foi possível salvar a rota.";
    return { error: message };
  }

  redirect("/dashboard/routes");
}

export async function deleteRouteAction(routeId: string) {
  const token = await getToken();
  if (!token) redirect("/login");
  await deleteRoute(token, routeId);
  revalidatePath("/dashboard/routes");
}
