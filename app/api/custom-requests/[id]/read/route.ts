/**
 * OPENED — POST /api/custom-requests/<id>/read
 * Sent automatically when a staff member opens a new request ("new" → "reviewing").
 * Needs permission custom = view.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

export async function POST(_request: Request, ctx: RouteContext<"/api/custom-requests/[id]/read">) {
  const guard = await guardRoute("custom", "view");
  if (!guard.ok) return guard.response;
  const result = await api.markCustomRead((await ctx.params).id, guard.session.token);
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 404 });
}
