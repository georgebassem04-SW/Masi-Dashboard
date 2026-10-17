/**
 * INTERNAL NOTE ON A CUSTOMIZATION REQUEST — POST /api/custom-requests/<id>/notes   Body: { note }
 * Staff-only (the customer never sees it). Needs permission custom = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({ note: z.string().trim().min(1).max(1000) });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/custom-requests/[id]/notes">) {
  const guard = await guardRoute("custom", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const result = await api.addCustomNote((await ctx.params).id, parsed.data.note, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json({ ok: true });
}
