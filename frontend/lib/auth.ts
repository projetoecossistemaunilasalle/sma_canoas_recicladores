import { cache } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";
import { getToken } from "./session";
import { redirectForRole } from "./redirect-for-role";
import type { CurrentUser } from "./types";

/**
 * Wrapped in React's cache() so layout + page can both call this within the
 * same request without doubling the /me round-trip to the backend.
 */
export const getCurrentUser = cache(
  async (token: string): Promise<CurrentUser | null> => {
    try {
      return await apiFetch<CurrentUser>("/me", token);
    } catch {
      return null;
    }
  }
);

/**
 * The `getToken() -> redirect if missing -> getCurrentUser() -> redirect if
 * missing` guard every protected layout/page repeats verbatim. getCurrentUser
 * is cache()'d, so calling this from both a layout and its page in the same
 * request doesn't cost an extra round-trip.
 */
export async function requireUser(loginPath = "/login"): Promise<{ token: string; user: CurrentUser }> {
  const token = await getToken();
  if (!token) redirect(loginPath);

  const user = await getCurrentUser(token);
  if (!user) redirect(loginPath);

  return { token, user };
}

/**
 * requireUser() for the dashboard pages: a cooperative_admin, plus the one
 * cooperative it manages (there is no global admin). The dashboard layout
 * already shows everyone else an "access restricted" page; this also gives
 * the page a non-null cooperativeId.
 */
export async function requireCooperativeAdmin(): Promise<{ token: string; user: CurrentUser; cooperativeId: string }> {
  const { token, user } = await requireUser("/admin/login");
  if (user.role !== "cooperative_admin" || !user.cooperativeId) redirect("/citizen");
  return { token, user, cooperativeId: user.cooperativeId };
}

/** The inverse guard used by the public entry pages (/, /login): send an already-signed-in visitor straight to their area instead of showing the page. */
export async function redirectIfAuthenticated(): Promise<void> {
  const token = await getToken();
  if (!token) return;

  const user = await getCurrentUser(token);
  if (user) redirectForRole(user.role);
}
