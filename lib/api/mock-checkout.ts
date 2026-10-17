/**
 * MOCK SHIPPING & PAYMENT (development only)
 * ------------------------------------------------------------------
 * mock-data/checkout-options.json is copied into .mock-db/db.json the first time; after that the
 * delivery areas, payment methods, VAT and store pickup are edited in Shipping & payment.
 * The storefront (DASHBOARD_URL) reads them through /api/public/pricing (together with gold prices).
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type { CheckoutOptions, CheckoutSaveResult, CheckoutSettings } from "@/types";
import { mutate, read } from "./mock-db";
import { checkoutProblem } from "@/lib/checkout-settings/rules";
import checkoutJson from "@/mock-data/checkout-options.json";

export function getCheckoutSettings(): CheckoutSettings {
  const existing = read((db) => db.checkout);
  if (existing) return existing;
  return mutate((db) => {
    const { priceLockMinutes: _l, priceChangeTolerancePct: _t, ...rest } = checkoutJson as unknown as CheckoutOptions;
    return (db.checkout ??= { ...rest, storePickup: rest.storePickup ?? true });
  });
}

export function saveCheckoutSettings(settings: CheckoutSettings): CheckoutSaveResult {
  const problem = checkoutProblem(settings);
  if (problem) return { ok: false, error: problem };
  mutate((db) => {
    db.checkout = settings;
  });
  return { ok: true, settings: getCheckoutSettings() };
}
