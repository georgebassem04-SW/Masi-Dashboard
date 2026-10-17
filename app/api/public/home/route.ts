/**
 * PUBLIC HOMEPAGE — GET /api/public/home[?preview=<token>]
 * The live homepage blocks; with a valid preview token (made by the Homepage editor's "Preview" button) the draft.
 * Read by the storefront in development (DASHBOARD_URL).
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { checkPreviewToken, HOME_PREVIEW } from "@/lib/pages/preview-token";

export async function GET(request: NextRequest) {
  const preview = await checkPreviewToken(request.nextUrl.searchParams.get("preview"), HOME_PREVIEW);
  return NextResponse.json(await api.getPublicHome(preview), { headers: { "Cache-Control": "no-store" } });
}
