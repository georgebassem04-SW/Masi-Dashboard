/**
 * ONE IMAGE
 *   PATCH  /api/media/<id>   Body: { alt: { ar, en } }  → change the image description
 *   DELETE /api/media/<id>                             → delete the image
 * Needs content OR theme = edit.
 * Note: deleting an image that is still used (e.g. as the logo) breaks it on the website — the
 * library shows a warning before deleting.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { can, getStaffSession } from "@/lib/auth/session";

const altSchema = z.object({ alt: z.object({ ar: z.string().trim().max(200), en: z.string().trim().max(200) }) });

async function editor() {
  const session = await getStaffSession();
  if (!session) return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  if (!can(session, "content", "edit") && !can(session, "theme", "edit")) {
    return { error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  const { session, error } = await editor();
  if (error) return error;
  const parsed = altSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const item = await api.updateMediaAlt((await ctx.params).id, parsed.data.alt, session.token);
  return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  const { session, error } = await editor();
  if (error) return error;
  const done = await api.deleteMedia((await ctx.params).id, session.token);
  return done ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}
