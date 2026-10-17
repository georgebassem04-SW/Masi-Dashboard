/**
 * PUBLIC STORE DETAILS — GET /api/public/store
 * Contact details and social links for the storefront in development (DASHBOARD_URL).
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  return NextResponse.json(await api.getPublicStore(), { headers: { "Cache-Control": "no-store" } });
}
