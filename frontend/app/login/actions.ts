"use server";

import { redirect } from "next/navigation";
import { loginUser, loginWithGoogle } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { redirectForRole } from "@/lib/redirect-for-role";

export interface LoginState {
  error?: string;
}

/** Citizens: the button's ID token. The first sign-in also creates the account. */
export async function googleLogin(credential: string): Promise<LoginState> {
  let auth;
  try {
    auth = await loginWithGoogle(credential);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: "Este e-mail já é usado por uma conta de cooperativa — entre com e-mail e senha abaixo." };
    }
    if (err instanceof ApiError && err.status === 403) {
      return { error: "Esta conta está desativada." };
    }
    return { error: "Não foi possível entrar com o Google. Tente novamente." };
  }

  await setSessionCookie(auth.token);
  redirectForRole(auth.user.role);
}

/** Cooperative staff — citizens have no password. */
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

/** The dashboard's "Sair" — back to the cooperatives' own login page. */
export async function logoutCooperative() {
  await clearSessionCookie();
  redirect("/admin/login");
}
