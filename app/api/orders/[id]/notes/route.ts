/**
 * INTERNAL NOTE — POST /api/orders/<id>/notes   Body: { note }
 * Staff-only note in the order history (never shown to the customer). Needs permission orders = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({ note: z.string().trim().min(1).max(1000) });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/orders/[id]/notes">) {
  const guard = await guardRoute("orders", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const { id } = await ctx.params;
  const result = await api.addOrderNote(id, parsed.data.note, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  return NextResponse.json({ ok: true });
}
