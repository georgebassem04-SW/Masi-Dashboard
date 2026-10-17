/**
 * SAVE SHIPPING & PAYMENT — PUT /api/checkout-settings   Body: delivery areas, payment methods, VAT, minimum order, store pickup
 * Refused (409) when the checkout would become unusable — e.g. no way to receive an order, or no payment
 * method for delivery (lib/checkout-settings/rules.ts). Needs permission checkout = edit.
 * The website's checkout refreshes right away (tag "checkout-options").
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { checkoutSettingsSchema } from "@/lib/validation/checkout-settings";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("checkout", "edit");
  if (!guard.ok) return guard.response;
  const parsed = checkoutSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  const result = await api.saveCheckoutSettings(parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["checkout-options"]);
  return NextResponse.json({ ok: true });
}
