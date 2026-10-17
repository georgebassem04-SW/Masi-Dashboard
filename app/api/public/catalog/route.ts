/**
 * PUBLIC CATALOG — GET /api/public/catalog
 * Visible products and categories only (no hidden items, no dashboard-only fields).
 * Used by the storefront while developing with sample data (its .env.local → DASHBOARD_URL),
 * so product and category changes made here show on the website right away.
 * With the real API the storefront reads the catalog from the API directly.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  const catalog = await api.getPublicCatalog();
  return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
}
