/**
 * DRAFT — PUT /api/pages/<slug>/draft     Body: { title, seo?, sections }  (auto-save while editing)
 *         DELETE /api/pages/<slug>/draft  (throw away unpublished changes)
 * Visitors never see drafts. Needs permission content = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { pageContentSchema } from "@/lib/validation/pages";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/pages/[slug]/draft">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const parsed = pageContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const result = await api.savePageDraft((await ctx.params).slug, parsed.data, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json({ ok: true, savedAt: result.page.draftSavedAt });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/pages/[slug]/draft">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.discardPageDraft((await ctx.params).slug, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  return NextResponse.json({ ok: true });
}
