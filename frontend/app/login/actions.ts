"use server";

import { redirect } from "next/navigation";
import { loginUser } from "@/lib/data";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { redirectForRole } from "@/lib/redirect-for-role";

export interface LoginState {
  error?: string;
}

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  let auth;
  try {
    auth = await loginUser(email, password);
  } catch {
    return { error: "E-mail ou senha inválidos." };
  }

  await setSessionCookie(auth.token);
  redirectForRole(auth.user.role);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
