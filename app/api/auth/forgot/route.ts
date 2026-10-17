/**
 * FORGOT PASSWORD — POST /api/auth/forgot   Body: { email }
 * Always answers { ok: true } (even for unknown emails) so nobody can test which emails are staff.
 * Limited to a few requests per minute per IP.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { isBlocked, recordFailure } from "@/lib/auth/rate-limit";

const schema = z.object({ email: z.email().max(200) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `forgot|${ip}`;
  if (isBlocked(key)) return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  recordFailure(key); // counts every request, so max 5 per minute

  try {
    await api.requestPasswordReset(parsed.data.email);
  } catch (e) {
    console.error("password reset request failed", e);
  }
  return NextResponse.json({ ok: true });
}
