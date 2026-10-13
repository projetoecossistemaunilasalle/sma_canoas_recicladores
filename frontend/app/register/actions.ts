"use server";

import { registerUser } from "@/lib/data";
import { ApiError } from "@/lib/api";
import { setSessionCookie } from "@/lib/session";
import { redirectForRole } from "@/lib/redirect-for-role";
import type { HouseSide } from "@/lib/types";

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
  const streetIdRaw = formData.get("addressStreetId");
  const sideRaw = String(formData.get("addressSide") ?? "");
  const lat = latRaw ? Number(latRaw) : undefined;
  const lng = lngRaw ? Number(lngRaw) : undefined;
  const addressNumber = String(formData.get("addressNumber") ?? "").trim() || null;
  const addressStreetId = streetIdRaw ? Number(streetIdRaw) : undefined;
  const addressSide: HouseSide | undefined = sideRaw === "left" || sideRaw === "right" ? sideRaw : undefined;

  if (!name || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (formData.get("addressIncomplete")) {
    return { error: "Marque sua casa no mapa e confirme o lado da rua — ou limpe o endereço." };
  }

  // The house pin only goes in together with the street + side confirmed
  // for it (the backend rejects a partial address).
  const hasAddress = lat !== undefined && lng !== undefined && addressStreetId !== undefined && addressSide;
  const addressFields = hasAddress ? { address, lat, lng, addressNumber, addressStreetId, addressSide } : {};

  let token: string;
  try {
    token = (await registerUser({ name, email, password, ...addressFields })).token;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: "Não foi possível criar sua conta. Tente novamente." };
  }

  await setSessionCookie(token);
  redirectForRole("user");
}
