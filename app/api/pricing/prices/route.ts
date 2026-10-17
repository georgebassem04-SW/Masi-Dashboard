/**
 * MANUAL GOLD PRICES — PUT /api/pricing/prices   Body: { prices: [{ karat, pricePerGram }] }
 * Only when the price source is "manual" (409 "erp_source" otherwise).
 * Needs permission pricing = edit. The website refreshes prices and product pages.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { goldPricesSchema } from "@/lib/validation/pricing";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("pricing", "edit");
  if (!guard.ok) return guard.response;
  const parsed = goldPricesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const result = await api.saveGoldPrices(parsed.data.prices, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  if (result.changed) await revalidateStorefront(["gold-prices", "products"]);
  return NextResponse.json({ ok: true, changed: result.changed });
}
