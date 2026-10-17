/**
 * PUBLIC BRANCHES — GET /api/public/branches
 * The branches, in their order, for the storefront in development (DASHBOARD_URL).
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET() {
  return NextResponse.json(await api.getBranches(), { headers: { "Cache-Control": "no-store" } });
}
