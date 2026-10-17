/**
 * PUBLIC MENU PAGES — GET /api/public/pages
 * Live pages placed in the top menu or the footer. Read by the storefront while developing
 * with sample data (its .env.local → DASHBOARD_URL). With the real API the storefront asks the API.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  return NextResponse.json(await api.getPublicMenu(), { headers: { "Cache-Control": "no-store" } });
}
