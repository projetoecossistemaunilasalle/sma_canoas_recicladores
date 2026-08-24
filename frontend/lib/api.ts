const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Server-side fetch to the backend, always scoped by the caller's own JWT.
 * Every list/detail endpoint on the backend filters by the token's
 * cooperativeId, so passing the signed-in user's token is what enforces
 * per-cooperative isolation — never fetch with any token but the caller's own.
 */
export async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      // Only set for requests with a body — Fastify's JSON parser rejects an
      // empty body sent with this header (e.g. plain DELETE calls).
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new ApiError(res.status, body.message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
