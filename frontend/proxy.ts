import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/constants";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    // Each area has its own login: cooperatives at /admin/login, citizens at /login.
    const loginPath = request.nextUrl.pathname.startsWith("/dashboard") ? "/admin/login" : "/login";
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/citizen/:path*"],
};
