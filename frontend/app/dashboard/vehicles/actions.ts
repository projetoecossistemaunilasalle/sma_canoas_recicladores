"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { createVehicle, updateVehicle, deleteVehicle, type VehicleInput } from "@/lib/data";
import { ApiError } from "@/lib/api";

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
