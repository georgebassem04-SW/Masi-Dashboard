/**
 * CUSTOMIZATION REQUEST STATUS — POST /api/custom-requests/<id>/status
 * Body: { status, note?, quote? }   (quote = price sent to the customer, kept with the request)
 * Needs permission custom = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CUSTOM_STATUSES } from "@/types";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({
  status: z.enum(CUSTOM_STATUSES),
  note: z.string().trim().max(1000).optional(),
  quote: z.number().min(0).max(100_000_000).optional(),
});

export async function POST(request: NextRequest, ctx: RouteContext<"/api/custom-requests/[id]/status">) {
  const guard = await guardRoute("custom", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const { note, ...rest } = parsed.data;
  const result = await api.setCustomStatus((await ctx.params).id, { ...rest, note: note || undefined }, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json({ ok: true });
}
