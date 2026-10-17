/**
 * REPLY — POST /api/inbox/<id>/reply   Body: { channel: "email" | "whatsapp" | "phone", text, markDone? }
 *   email    -> the API emails the reply to the visitor
 *   whatsapp -> the browser opens WhatsApp with the text ready; this only records it
 *   phone    -> a summary of the call, recorded only
 * Needs permission inbox = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";

const schema = z.object({
  channel: z.enum(["email", "whatsapp", "phone"]),
  text: z.string().trim().min(1).max(3000),
  markDone: z.boolean().optional(),
});

export async function POST(request: NextRequest, ctx: RouteContext<"/api/inbox/[id]/reply">) {
  const guard = await guardRoute("inbox", "edit");
  if (!guard.ok) return guard.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const result = await api.replyToMessage((await ctx.params).id, parsed.data, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 422 });
  return NextResponse.json({ ok: true });
}
