"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { getNearestStreet, saveRoute, previewRoute, deleteRoute } from "@/lib/data";
import { ApiError } from "@/lib/api";
import type { Street, RoutePreviewSegment, RouteStopInput, DayOfWeek, Shift } from "@/lib/types";

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

export interface SaveRouteState {
  error?: string;
}

const SIDES: readonly string[] = ["both", "left", "right"];

// The route builder posts its stops as one JSON hidden field. Anything
// malformed is dropped here; the backend re-validates the rest anyway.
function parseStops(raw: string): RouteStopInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (s): s is RouteStopInput =>
      typeof s === "object" &&
      s !== null &&
      Number.isInteger(s.streetId) &&
      SIDES.includes(s.side) &&
      typeof s.startFraction === "number" &&
      typeof s.endFraction === "number"
  );
}

/**
 * Bound with a routeId (from the edit page) or undefined (from the "new
 * route" page) before being handed to useActionState — see RouteBuilder.
 * Schedule and stops go to the backend together, which saves both or
 * neither.
 */
export async function saveRouteAction(
  routeId: string | undefined,
  _prevState: SaveRouteState,
  formData: FormData
): Promise<SaveRouteState> {
  const token = await getToken();
  if (!token) redirect("/login");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const shift = String(formData.get("shift") ?? "") as Shift;
  const startTime = String(formData.get("startTime") ?? "");
  const daysOfWeek = formData.getAll("daysOfWeek").map(String) as DayOfWeek[];
  const stops = parseStops(String(formData.get("stops") ?? ""));

  if (!vehicleId) return { error: "Selecione um veículo." };
  if (daysOfWeek.length === 0) return { error: "Selecione ao menos um dia da semana." };
  if (!shift) return { error: "Selecione o turno." };
  if (!startTime) return { error: "Informe o horário de início." };
  if (stops.length === 0) {
    return { error: "Desenhe a rota no mapa, clicando/arrastando sobre as ruas, em ordem." };
  }

  try {
    await saveRoute(token, routeId, { vehicleId, daysOfWeek, shift, startTime, stops });
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : "Não foi possível salvar a rota." };
  }

  redirect("/dashboard/routes");
}

export async function deleteRouteAction(routeId: string) {
  const token = await getToken();
  if (!token) redirect("/login");
  await deleteRoute(token, routeId);
  revalidatePath("/dashboard/routes");
}
