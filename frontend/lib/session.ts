import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
