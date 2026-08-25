"use server";

import { getToken } from "@/lib/session";
import {
  updateProfile,
  savePushSubscription,
  deletePushSubscription,
  type UpdateProfileInput,
  type PushSubscriptionInput,
} from "@/lib/data";
import type { CurrentUser } from "@/lib/types";

export async function updateProfileAction(
  data: UpdateProfileInput
): Promise<{ result?: CurrentUser; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  try {
    const result = await updateProfile(token, data);
    return { result };
  } catch {
    return { error: "Não foi possível salvar. Tente novamente." };
  }
}

export async function savePushSubscriptionAction(
  data: PushSubscriptionInput
): Promise<{ ok: boolean }> {
  const token = await getToken();
  if (!token) return { ok: false };

  try {
    await savePushSubscription(token, data);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deletePushSubscriptionAction(endpoint: string): Promise<{ ok: boolean }> {
  const token = await getToken();
  if (!token) return { ok: false };

  try {
    await deletePushSubscription(token, endpoint);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
