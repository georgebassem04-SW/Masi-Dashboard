/**
 * STAFF LOGIN — POST /api/auth/login
 * Body: { email, password }
 * Answers: { ok: true } | { ok: false, error: "invalid_credentials" | "inactive" | "too_many_attempts" | "validation" }
 * The same error is returned for "no such email" and "wrong password".
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { createStaffSession } from "@/lib/auth/session";
import { clearFailures, isBlocked, recordFailure } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${parsed.data.email.toLowerCase()}|${ip}`;
  if (isBlocked(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });

  const result = await api.login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    recordFailure(key);
    const status = result.error === "too_many_attempts" ? 429 : 401;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  clearFailures(key);
  await createStaffSession(result.staff, result.token);
  return NextResponse.json({ ok: true });
}
