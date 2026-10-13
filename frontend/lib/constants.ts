export const SESSION_COOKIE = "session";

/** Where server-side code — and next.config.ts's /api rewrite — reaches the backend. */
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
