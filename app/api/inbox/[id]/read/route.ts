/**
 * MARK AS READ — POST /api/inbox/<id>/read
 * Sent automatically when a staff member opens a new message ("new" → "open").
 * Needs permission inbox = view (reading is enough).
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

export async function POST(_request: Request, ctx: RouteContext<"/api/inbox/[id]/read">) {
  const guard = await guardRoute("inbox", "view");
  if (!guard.ok) return guard.response;
  const result = await api.markMessageRead((await ctx.params).id, guard.session.token);
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 404 });
}
