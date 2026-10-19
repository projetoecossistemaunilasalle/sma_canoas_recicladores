
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/constants";
import { redirectForRole } from "@/lib/redirect-for-role";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3001";

export interface LoginState {
  error?: string;
}

type AuthResponse = {
  token: string;
  user: {
    role: string;
  };
};

async function createSession(data: AuthResponse): Promise<never> {
  const store = await cookies();

  store.set(SESSION_COOKIE, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirectForRole(data.user.role);

  // Garante um redirecionamento caso redirectForRole retorne normalmente.
  redirect("/login");
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  let data: AuthResponse;

  try {
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { error: "E-mail ou senha inválidos." };
    }

    data = (await response.json()) as AuthResponse;
  } catch {
    return {
      error: "Não foi possível conectar ao servidor. Tente novamente.",
    };
  }

  return await createSession(data);
}

export async function loginWithGoogle(
  idToken: string
): Promise<LoginState> {
  if (!idToken) {
    return {
      error: "Não foi possível validar sua conta Google.",
    };
  }

  let data: AuthResponse;

  try {
    const response = await fetch(`${BACKEND_URL}/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 409) {
        return {
          error: "Este e-mail já possui cadastro. Entre com sua senha.",
        };
      }

      if (response.status === 401) {
        return {
          error: "Não foi possível autenticar sua conta Google.",
        };
      }

      return {
        error: "Falha ao entrar com Google. Tente novamente.",
      };
    }

    data = (await response.json()) as AuthResponse;
  } catch {
    return {
      error: "Não foi possível conectar ao servidor. Tente novamente.",
    };
  }

  return await createSession(data);
}

export async function logout(): Promise<never> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
