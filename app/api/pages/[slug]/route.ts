/**
 * PAGE SETTINGS — PATCH /api/pages/<slug>   Body: { menu, slug? }  (menu placement is live right away)
 * DELETE PAGE   — DELETE /api/pages/<slug>  (custom pages only; About / Contact / FAQ / Terms can't be deleted)
 * Needs permission content = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { pageSettingsSchema } from "@/lib/validation/pages";
import { RESERVED_SLUGS } from "@/lib/pages/paths";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/pages/[slug]">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const parsed = pageSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  if (parsed.data.slug && RESERVED_SLUGS.includes(parsed.data.slug)) return NextResponse.json({ ok: false, error: "slug_taken" }, { status: 409 });
  const { slug } = await ctx.params;
  const result = await api.updatePageSettings(slug, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  await revalidateStorefront(["pages", `page:${slug}`, `page:${result.page.slug}`]);
  return NextResponse.json({ ok: true, slug: result.page.slug });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/pages/[slug]">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const { slug } = await ctx.params;
  const result = await api.deletePage(slug, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  await revalidateStorefront(["pages", `page:${slug}`]);
  return NextResponse.json({ ok: true });
}
