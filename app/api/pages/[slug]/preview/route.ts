/**
 * PREVIEW LINK — GET /api/pages/<slug>/preview?locale=ar
 * Answers { url }: the page on the storefront with a 30-minute preview token, showing the unpublished draft.
 * Needs permission content = view.
 */
import { NextResponse, type NextRequest } from "next/server";
import { guardRoute } from "@/lib/auth/route-guard";
import { createPreviewToken } from "@/lib/pages/preview-token";
import { pagePath } from "@/lib/pages/paths";
import { storeConfig } from "@/config/store";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/pages/[slug]/preview">) {
  const guard = await guardRoute("content", "view");
  if (!guard.ok) return guard.response;
  const { slug } = await ctx.params;
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const token = await createPreviewToken(slug);
  const url = `${storeConfig.storefrontUrl.replace(/\/$/, "")}/${locale}${pagePath(slug)}?preview=${encodeURIComponent(token)}`;
  return NextResponse.json({ ok: true, url });
}
