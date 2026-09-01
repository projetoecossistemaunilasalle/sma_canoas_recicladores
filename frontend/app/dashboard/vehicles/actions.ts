"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { createVehicle, updateVehicle, deleteVehicle, loanVehicle, returnVehicleLoan, type VehicleInput } from "@/lib/data";
import { ApiError } from "@/lib/api";
import type { ConflictingRoute } from "@/lib/types";

export interface VehicleFormState {
  error?: string;
}

function readVehicleForm(formData: FormData): VehicleInput {
  const plate = String(formData.get("plate") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const cooperativeId = String(formData.get("cooperativeId") ?? "").trim();

  return {
    plate: plate || undefined,
    model: model || undefined,
    color: color || undefined,
    type: type || undefined,
    cooperativeId: cooperativeId || undefined,
    active: formData.get("active") === "on",
  };
}

export async function createVehicleAction(
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const token = await getToken();
  if (!token) redirect("/login");

  try {
    await createVehicle(token, readVehicleForm(formData));
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Não foi possível criar o veículo.";
    return { error: message };
  }

  revalidatePath("/dashboard/vehicles");
  redirect("/dashboard/vehicles");
}

export async function updateVehicleAction(
  vehicleId: string,
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const token = await getToken();
  if (!token) redirect("/login");

  try {
    await updateVehicle(token, vehicleId, readVehicleForm(formData));
  } catch (err) {
    const message = err instanceof ApiError ? err.message : "Não foi possível salvar o veículo.";
    return { error: message };
  }

  revalidatePath("/dashboard/vehicles");
  redirect("/dashboard/vehicles");
}

export async function deleteVehicleAction(vehicleId: string) {
  const token = await getToken();
  if (!token) redirect("/login");

  try {
    await deleteVehicle(token, vehicleId);
  } catch {
    redirect(
      `/dashboard/vehicles?error=${encodeURIComponent(
        "Não foi possível excluir: o veículo possui rotas ou registros vinculados."
      )}`
    );
  }

  revalidatePath("/dashboard/vehicles");
}

export interface LoanFormState {
  error?: string;
  conflictRoutes?: ConflictingRoute[];
  success?: boolean;
}

function readRouteConflict(err: ApiError): ConflictingRoute[] | undefined {
  if (err.status !== 409) return undefined;
  const data = err.data as { routes?: ConflictingRoute[] } | undefined;
  return data?.routes;
}

export async function loanVehicleAction(
  vehicleId: string,
  _prevState: LoanFormState,
  formData: FormData
): Promise<LoanFormState> {
  const token = await getToken();
  if (!token) redirect("/login");

  const cooperativeId = String(formData.get("cooperativeId") ?? "").trim();
  const confirmUnlink = formData.get("confirmUnlink") === "true";
  if (!cooperativeId) return { error: "Selecione a cooperativa que vai receber o veículo." };

  try {
    await loanVehicle(token, vehicleId, cooperativeId, confirmUnlink);
  } catch (err) {
    if (err instanceof ApiError) {
      const conflictRoutes = readRouteConflict(err);
      if (conflictRoutes) return { error: err.message, conflictRoutes };
      return { error: err.message };
    }
    return { error: "Não foi possível emprestar o veículo." };
  }

  revalidatePath("/dashboard/vehicles");
  return { success: true };
}

export async function returnVehicleLoanAction(
  vehicleId: string,
  _prevState: LoanFormState,
  formData: FormData
): Promise<LoanFormState> {
  const token = await getToken();
  if (!token) redirect("/login");

  const confirmUnlink = formData.get("confirmUnlink") === "true";

  try {
    await returnVehicleLoan(token, vehicleId, confirmUnlink);
  } catch (err) {
    if (err instanceof ApiError) {
      const conflictRoutes = readRouteConflict(err);
      if (conflictRoutes) return { error: err.message, conflictRoutes };
      return { error: err.message };
    }
    return { error: "Não foi possível encerrar o empréstimo." };
  }

  revalidatePath("/dashboard/vehicles");
  return { success: true };
}
