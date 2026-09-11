"use server";

import { revalidatePath } from "next/cache";
import { getToken } from "@/lib/session";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement, type AnnouncementInput } from "@/lib/data";
import type { Announcement } from "@/lib/types";

export async function createAnnouncementAction(
  data: AnnouncementInput
): Promise<{ result?: Announcement; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  try {
    const result = await createAnnouncement(token, data);
    return { result };
  } catch {
    return { error: "Não foi possível publicar. Tente novamente." };
  }
}

export async function updateAnnouncementAction(
  id: string,
  data: AnnouncementInput
): Promise<{ result?: Announcement; error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  try {
    const result = await updateAnnouncement(token, id, data);
    revalidatePath("/citizen/avisos");
    return { result };
  } catch {
    return { error: "Não foi possível salvar as alterações. Tente novamente." };
  }
}

export async function deleteAnnouncementAction(id: string): Promise<{ error?: string }> {
  const token = await getToken();
  if (!token) return { error: "Sessão expirada. Faça login novamente." };

  try {
    await deleteAnnouncement(token, id);
    revalidatePath("/citizen/avisos");
    return {};
  } catch {
    return { error: "Não foi possível excluir. Tente novamente." };
  }
}
