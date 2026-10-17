/**
 * SHIPPING & PAYMENT SAFETY RULES — checked before saving, so the checkout can never end up unusable:
 *   - there must be a way to receive the order: at least one active delivery area, or store pickup on
 *   - every way that's on must have at least one active payment method that allows it
 * The page shows the problem; the API route refuses to save (same function on both sides).
 */
import type { CheckoutSaveResult, CheckoutSettings } from "@/types";

export function checkoutProblem(s: CheckoutSettings): Extract<CheckoutSaveResult, { ok: false }>["error"] | null {
  const delivery = s.shippingZones.some((z) => z.isActive);
  const pickup = s.storePickup !== false;
  if (!delivery && !pickup) return "no_way_to_receive";
  const pays = (m: "delivery" | "store_pickup") => s.paymentMethods.some((p) => p.isActive && p.availableFor.includes(m));
  if (delivery && !pays("delivery")) return "no_payment_for_delivery";
  if (pickup && !pays("store_pickup")) return "no_payment_for_pickup";
  return null;
}
