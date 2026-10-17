/**
 * TAKE OFFLINE — POST /api/pages/<slug>/unpublish
 * The page disappears from the website (its content is kept as a draft). Needs permission content = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/pages/[slug]/unpublish">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const { slug } = await ctx.params;
  const result = await api.unpublishPage(slug, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  await revalidateStorefront(["pages", `page:${slug}`]);
  return NextResponse.json({ ok: true });
}
