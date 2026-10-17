/**
 * HOMEPAGE PREVIEW LINK — GET /api/home/preview?locale=ar
 * Answers { url }: the storefront homepage with a 30-minute preview token, showing the unpublished draft.
 * Needs permission content = view.
 */
import { NextResponse, type NextRequest } from "next/server";
import { guardRoute } from "@/lib/auth/route-guard";
import { createPreviewToken, HOME_PREVIEW } from "@/lib/pages/preview-token";
import { storeConfig } from "@/config/store";

export async function GET(request: NextRequest) {
  const guard = await guardRoute("content", "view");
  if (!guard.ok) return guard.response;
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const token = await createPreviewToken(HOME_PREVIEW);
  return NextResponse.json({ ok: true, url: `${storeConfig.storefrontUrl.replace(/\/$/, "")}/${locale}?preview=${encodeURIComponent(token)}` });
}
