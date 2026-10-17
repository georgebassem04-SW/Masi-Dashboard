/**
 * LOGIN GATE (runs before every page)
 * ------------------------------------------------------------------
 * - Not logged in and opening any page      -> sent to /login
 *
 * This is a quick first check (it only looks for the cookie). The real check — is the cookie valid,
 * not expired, not faked — happens in app/(admin)/layout.tsx with requireStaff().
 * (Sending logged-in staff away from /login is done by app/login/page.tsx, which can check
 * that the cookie is really valid — doing it here could loop with an expired cookie.)
 * (In Next.js 16 this file is called proxy.ts; older versions called it middleware.ts.)
 */
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session"; // same name as lib/auth/session.ts
const PUBLIC_PATHS = ["/login", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!loggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
}

export const config = {
  // Skip Next internals, API routes and files with a dot (logo.svg, favicon.ico)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
