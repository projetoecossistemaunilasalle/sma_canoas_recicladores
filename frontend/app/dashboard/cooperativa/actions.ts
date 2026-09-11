"use server";

import { getToken } from "@/lib/session";
import { updateCooperative, type CooperativeInput } from "@/lib/data";
import type { Cooperative } from "@/lib/types";

export async function updateCooperativeAction(
  id: string,
  data: CooperativeInput
): Promise<{ result?: Cooperative; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  try {
    const result = await updateCooperative(token, id, data);
    return { result };
  } catch {
    return { error: "Não foi possível salvar. Tente novamente." };
  }
}
