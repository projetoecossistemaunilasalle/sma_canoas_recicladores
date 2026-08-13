import { cache } from "react";
import { apiFetch } from "./api";
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
