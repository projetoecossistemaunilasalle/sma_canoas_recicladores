"use server";

import { getToken } from "@/lib/session";
import { getEta } from "@/lib/data";
import type { EtaResult } from "@/lib/types";

export async function checkEtaAction(
  vehicleId: string,
  lat: number,
  lng: number
): Promise<{ result?: EtaResult; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  const result = await getEta(token, vehicleId, lat, lng);
  if (!result) return { error: "Veículo não encontrado." };
  return { result };
}
