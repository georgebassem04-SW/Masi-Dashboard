/**
 * PUBLIC PAGE — GET /api/public/pages/<slug>[?preview=<token>]
 * The live page; with a valid preview token (made by the editor's "Preview" button) the unpublished draft.
 * 404 when the page doesn't exist or isn't live. Read by the storefront in development (DASHBOARD_URL).
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { checkPreviewToken } from "@/lib/pages/preview-token";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/public/pages/[slug]">) {
  const { slug } = await ctx.params;
  const preview = await checkPreviewToken(request.nextUrl.searchParams.get("preview"), slug);
  const page = await api.getPublicPage(slug, preview);
  if (!page) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
}
