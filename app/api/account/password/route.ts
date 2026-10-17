/**
 * CHANGE MY PASSWORD — PUT /api/account/password   Body: { current, next }
 * Any logged-in staff member (also someone on a temporary password — this is how they leave it).
 * Answers 400 { error: "wrong_password" } when the current password is wrong; the same login-attempt
 * limit as the login page applies, so it can't be used to guess passwords.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { createStaffSession, getStaffSession } from "@/lib/auth/session";
import { clearFailures, isBlocked, recordFailure } from "@/lib/auth/rate-limit";
import { changePasswordSchema } from "@/lib/validation/settings";
import { issues } from "@/lib/validation/issues";

export async function PUT(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });

  const key = `change-password|${session.staffId}`;
  if (isBlocked(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  const result = await api.changeOwnPassword(session.staffId, parsed.data.current, parsed.data.next, session.token);
  if (!result.ok) {
    if (result.error === "wrong_password") recordFailure(key);
    return NextResponse.json(result, { status: result.error === "wrong_password" ? 400 : 404 });
  }
  clearFailures(key);
  // New cookie without the "must change password" mark
  await createStaffSession(result.staff, session.token);
  return NextResponse.json({ ok: true });
}
