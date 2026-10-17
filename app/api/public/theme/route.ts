/**
 * PUBLIC THEME (development link) — GET /api/public/theme
 * ------------------------------------------------------------------
 * Lets the storefront read the PUBLISHED theme from this dashboard while both run on your computer
 * with sample data (storefront .env.local → DASHBOARD_URL=http://localhost:3002).
 * Only the published look is returned (colours, fonts, logo, texts) — nothing private.
 * With the real API (DATA_SOURCE=http) the API serves the theme itself, so this route answers 404.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.DATA_SOURCE === "http") return NextResponse.json({ error: "not_found" }, { status: 404 });
  const theme = await api.getPublishedTheme();
  return NextResponse.json(theme, { headers: { "Cache-Control": "no-store" } });
}
