/**
 * CHANGE PAYMENT STATUS — POST /api/orders/<id>/payment   Body: { paymentStatus: "paid" | "refunded" }
 * Used for bank transfers (money arrived), cash / pay-in-store, and refunds after cancel/return.
 * Needs permission orders = edit. Allowed changes: nextPaymentStatuses() in lib/orders/workflow.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({ paymentStatus: z.enum(["paid", "refunded"]) });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/orders/[id]/payment">) {
  const guard = await guardRoute("orders", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const { id } = await ctx.params;
  const result = await api.updatePaymentStatus(id, parsed.data.paymentStatus, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  return NextResponse.json({ ok: true });
}
