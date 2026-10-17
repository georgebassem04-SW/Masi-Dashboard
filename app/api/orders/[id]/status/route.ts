/**
 * CHANGE ORDER STATUS — POST /api/orders/<id>/status
 * Body: { status, note?, trackingNumber? }   (note is required for cancelled / returned)
 * Needs permission orders = edit. The allowed steps are in lib/orders/workflow.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { ORDER_STATUSES } from "@/lib/orders/query";

const schema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(500).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
});

export async function POST(request: NextRequest, ctx: RouteContext<"/api/orders/[id]/status">) {
  const guard = await guardRoute("orders", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const { id } = await ctx.params;
  const result = await api.updateOrderStatus(id, parsed.data as never, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  return NextResponse.json({ ok: true });
}
