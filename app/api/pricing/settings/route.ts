/**
 * PRICE SOURCE & PRICE LOCK — PUT /api/pricing/settings   Body: { source, priceLockMinutes, priceChangeTolerancePct }
 * Needs permission pricing = edit. The website's checkout rules refresh right away.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { pricingSettingsSchema } from "@/lib/validation/pricing";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("pricing", "edit");
  if (!guard.ok) return guard.response;
  const parsed = pricingSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  await api.savePricingSettings(parsed.data, guard.session.token);
  await revalidateStorefront(["checkout-options"]);
  return NextResponse.json({ ok: true });
}
