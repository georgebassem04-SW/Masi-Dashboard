/**
 * PRICING FOR THE STOREFRONT (development only) — GET /api/public/pricing
 * Gold prices, active discount codes (with how many times they were used) and the price-lock rules.
 * Read by the storefront's SERVER while developing with sample data (its .env.local → DASHBOARD_URL).
 *
 * Because it lists the discount codes, it only works in sample-data mode (DATA_SOURCE=mock).
 * With the real API (DATA_SOURCE=http) it answers 404: the storefront then asks the API, which checks codes itself.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  if (process.env.DATA_SOURCE === "http") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json(await api.getPublicPricing(), { headers: { "Cache-Control": "no-store" } });
}
