import { BACKEND_URL } from "./constants";

export class ApiError extends Error {
  status: number;
  // Parsed JSON error body, when there was one — lets callers read structured
  // fields beyond `message` (e.g. the `routes` array on a 409 loan conflict)
  // without every call site re-parsing the response itself.
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Server-side fetch to the backend. Pass the signed-in user's own JWT —
 * every list/detail endpoint filters by the token's cooperativeId, so that's
 * what enforces per-cooperative isolation; never any token but the caller's.
 * `null` only for the anonymous endpoints (login, register).
 */
export async function apiFetch<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Only set for requests with a body — Fastify's JSON parser rejects an
      // empty body sent with this header (e.g. plain DELETE calls).
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(res.status, body.message ?? res.statusText, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
