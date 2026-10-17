/**
 * STOP / REACTIVATE A CUSTOMER ACCOUNT — POST /api/customers/<id>/status
 * Body: { disabled: true, reason: "…" }  or  { disabled: false }
 * A stopped customer can't log in on the website (the reason is saved in the customer's history).
 * Needs permission customers = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({ disabled: z.boolean(), reason: z.string().trim().max(500).optional() });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/customers/[id]/status">) {
  const guard = await guardRoute("customers", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const { id } = await ctx.params;
  const { disabled, reason } = parsed.data;
  const result = await api.setCustomerDisabled(id, disabled, reason, guard.session.name, guard.session.token);
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : result.error === "reason_required" ? 422 : 409;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true });
}
