"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/constants";
import { registerUser } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { redirectForRole } from "@/lib/redirect-for-role";

export interface RegisterState {
  error?: string;
}

export async function register(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const lat = latRaw ? Number(latRaw) : undefined;
  const lng = lngRaw ? Number(lngRaw) : undefined;

  if (!name || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  let token: string;
  try {
    const data = await registerUser({ name, email, password, address, lat, lng });
    token = data.token;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: "Não foi possível criar sua conta. Tente novamente." };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirectForRole("user");
}
