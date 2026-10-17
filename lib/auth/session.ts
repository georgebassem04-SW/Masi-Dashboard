/**
 * STAFF LOGIN SESSION — who is logged in to the dashboard.
 * ------------------------------------------------------------------
 * After login we save a small signed token (JWT) in the cookie "admin_session":
 *   - httpOnly: page JavaScript can't read it
 *   - signed with AUTH_SECRET (.env.local): nobody can fake or edit it
 *   - expires after storeConfig.sessionHours (default 8 hours) → staff log in again
 * It holds the staff id, name, role, permissions and the API token — never the password.
 * On every request the account is read again (api.getStaffAccess): a staff member who was switched off
 * or deleted is logged out at once, and changed permissions work at once — not only at their next login.
 * Someone with a temporary password is sent to Settings → My account until they choose their own.
 *
 * Separate from the storefront's customer cookie ("session"), and the dashboard runs on its own
 * subdomain (admin.client.com), so customer and staff logins can never mix.
 *
 * Use on the server:
 *   await getStaffSession()          -> null when logged out
 *   await requireStaff()             -> sends to /login when logged out
 *   can(session, "orders", "edit")   -> true / false (pages show <NoAccess /> when false)
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import type { LocalizedText, StaffUser } from "@/types";
import { storeConfig } from "@/config/store";
import { toLocalized } from "@/lib/format";
import { api } from "@/lib/api";
import { hasAccess, ROLE_PRESETS, type AccessLevel, type PermissionKey, type Permissions, type Role } from "./permissions";

export const SESSION_COOKIE = "admin_session";

export interface StaffSession {
  staffId: string;
  /** Name in both languages — show it with t(session.name, locale) */
  name: LocalizedText;
  email: string;
  role: Role;
  permissions: Permissions;
  /** Token from the real API, sent with every API request */
  token?: string;
  /** Has a temporary password: must choose a new one (Settings → My account) before anything else */
  mustChangePassword?: boolean;
}

/** Where someone with a temporary password is sent */
export const CHANGE_PASSWORD_PATH = "/settings/account?first=1";

export function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ characters) in production");
    // Development fallback so the project runs without setup. NEVER used in production.
    return new TextEncoder().encode("dev-only-dashboard-secret-change-me-dev-only");
  }
  return new TextEncoder().encode(secret);
}

export async function createStaffSession(staff: StaffUser, token?: string) {
  const permissions = staff.permissions ?? ROLE_PRESETS[staff.role];
  const jwt = await new SignJWT({ name: toLocalized(staff.name), email: staff.email, role: staff.role, permissions, token, mustChangePassword: staff.mustChangePassword === true })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(staff.id)
    .setIssuedAt()
    .setExpirationTime(`${storeConfig.sessionHours}h`)
    .sign(secretKey());

  (await cookies()).set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "strict": the cookie is never sent when another website links/posts to the dashboard
    sameSite: "strict",
    path: "/",
    maxAge: storeConfig.sessionHours * 60 * 60,
  });
}

/** The account as it is NOW (once per request). undefined = couldn't check (API down) → use the cookie's copy */
const currentAccess = cache(async (staffId: string, token?: string) => api.getStaffAccess(staffId, token).catch(() => undefined));

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const jwt = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!jwt) return null;
  let session: StaffSession;
  try {
    const { payload } = await jwtVerify(jwt, secretKey());
    const role = payload.role as Role;
    session = {
      staffId: String(payload.sub),
      name: toLocalized(payload.name),
      email: String(payload.email ?? ""),
      role,
      permissions: (payload.permissions as Permissions) ?? ROLE_PRESETS[role],
      token: payload.token as string | undefined,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null; // expired or tampered
  }
  const access = await currentAccess(session.staffId, session.token);
  if (access === null || access?.active === false) return null; // deleted or switched off
  if (access) {
    Object.assign(session, {
      name: toLocalized(access.name),
      email: access.email,
      role: access.role,
      permissions: access.role === "owner" ? ROLE_PRESETS.owner : (access.permissions ?? ROLE_PRESETS[access.role]),
      mustChangePassword: access.mustChangePassword === true,
    });
  }
  return session;
});

/**
 * Every page starts with this. Logged out → /login. Temporary password → Settings → My account
 * (that page passes { passwordPage: true } so it can open).
 */
export async function requireStaff(options?: { passwordPage?: boolean }): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  if (session.mustChangePassword && !options?.passwordPage) redirect(CHANGE_PASSWORD_PATH);
  return session;
}

export function can(session: StaffSession, key: PermissionKey, level: AccessLevel = "view") {
  return hasAccess(session.permissions, key, level);
}

export async function destroyStaffSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
