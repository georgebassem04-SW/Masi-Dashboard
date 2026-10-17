/**
 * API ROUTE GUARD — every dashboard API route that reads or changes data starts with:
 *     const guard = await guardRoute("theme", "edit");
 *     if (!guard.ok) return guard.response;
 *     const session = guard.session;
 * Not logged in (or switched off) → 401. Logged in without the permission → 403.
 * Still on a temporary password → 403 "password_change_required" (only My account → change password works).
 * (Pages hide buttons the user can't use, but the API checks again — never trust the browser.)
 */
import "server-only";
import { NextResponse } from "next/server";
import { can, getStaffSession, type StaffSession } from "./session";
import type { AccessLevel, PermissionKey } from "./permissions";

export async function guardRoute(
  key: PermissionKey,
  level: AccessLevel,
): Promise<{ ok: true; session: StaffSession } | { ok: false; response: NextResponse }> {
  const session = await getStaffSession();
  if (!session) return { ok: false, response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  if (session.mustChangePassword) return { ok: false, response: NextResponse.json({ ok: false, error: "password_change_required" }, { status: 403 }) };
  if (!can(session, key, level)) return { ok: false, response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  return { ok: true, session };
}
