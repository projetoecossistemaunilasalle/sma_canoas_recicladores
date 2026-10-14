"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { createVehicle, updateVehicle, deleteVehicle, setVehicleLoan } from "@/lib/data";
import { ApiError } from "@/lib/api";
import type { ConflictingRoute, VehicleInput } from "@/lib/types";

export interface VehicleFormState {
  error?: string;
}

function readVehicleForm(formData: FormData): VehicleInput {
  const plate = String(formData.get("plate") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();

  return {
    plate: plate || undefined,
    model: model || undefined,
    color: color || undefined,
    type: (type || undefined) as VehicleInput["type"],
    active: formData.get("active") === "on",
  };
}

export async function createVehicleAction(
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const token = await getToken();
  if (!token) redirect("/admin/login");

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
  if (!token) redirect("/admin/login");

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
  if (!token) redirect("/admin/login");

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

/**
 * Bound with the vehicle and whether this lends it (`lend`, reading the target
 * cooperative from the form) or ends its loan. Either way a 409 brings back
 * the routes that would lose the vehicle, so the dialog can ask to confirm.
 */
export async function vehicleLoanAction(
  vehicleId: string,
  lend: boolean,
  _prevState: LoanFormState,
  formData: FormData
): Promise<LoanFormState> {
  const token = await getToken();
  if (!token) redirect("/admin/login");

  const cooperativeId = lend ? String(formData.get("cooperativeId") ?? "").trim() : null;
  const confirmUnlink = formData.get("confirmUnlink") === "true";
  if (lend && !cooperativeId) return { error: "Selecione a cooperativa que vai receber o veículo." };

  try {
    await setVehicleLoan(token, vehicleId, cooperativeId, confirmUnlink);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message, conflictRoutes: readRouteConflict(err) };
    return { error: lend ? "Não foi possível emprestar o veículo." : "Não foi possível encerrar o empréstimo." };
  }

  revalidatePath("/dashboard/vehicles");
  return { success: true };
}
