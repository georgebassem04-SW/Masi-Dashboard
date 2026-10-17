/**
 * MESSAGE STATUS — POST /api/inbox/<id>/status   Body: { status: "done" | "open" }
 * "done" = handled, "open" = reopen. Needs permission inbox = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({ status: z.enum(["open", "done"]) });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/inbox/[id]/status">) {
  const guard = await guardRoute("inbox", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const result = await api.setMessageStatus((await ctx.params).id, parsed.data.status, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json({ ok: true });
}
