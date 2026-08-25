"use server";

import { getToken } from "@/lib/session";
import { updateUser } from "@/lib/data";

export async function updateProfile(formData: FormData) {
  const token = await getToken();

  if (!token) {
    return {
      success: false,
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!userId) {
    return {
      success: false,
      message: "Usuário não identificado.",
    };
  }

  if (!name) {
    return {
      success: false,
      message: "O nome é obrigatório.",
    };
  }

  if (!email) {
    return {
      success: false,
      message: "O e-mail é obrigatório.",
    };
  }

  const data: {
    name: string;
    email: string;
    address?: string;
    password?: string;
  } = {
    name,
    email,
    address,
  };

  if (password.trim()) {
    data.password = password.trim();
  }

  try {
    const updatedUser = await updateUser(
      token,
      userId,
      data
    );

    console.log("Usuário atualizado:", updatedUser);

    return {
      success: true,
      message: "Alterações salvas com sucesso.",
    };
  } catch (error) {
    console.error("ERRO AO ATUALIZAR USUÁRIO:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "Erro desconhecido ao atualizar usuário.",
    };
  }
}