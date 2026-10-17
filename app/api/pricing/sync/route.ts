/**
 * SYNC GOLD PRICES FROM ERP — POST /api/pricing/sync
 * Needs permission pricing = edit. The website refreshes prices and product pages when something changed.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST() {
  const guard = await guardRoute("pricing", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.syncGoldPrices(guard.session.token);
  if (result.changed) await revalidateStorefront(["gold-prices", "products"]);
  return NextResponse.json({ ok: true, changed: result.changed });
}
