/**
 * MOCK GOLD PRICES & COUPONS (development only)
 * ------------------------------------------------------------------
 * - mock-data/gold-prices.json plays the ERP price feed: "Sync now" (ERP mode) copies prices from it.
 *   Edit that file to simulate the ERP changing the price. In manual mode staff type the prices.
 * - mock-data/coupons.json has the starting discount codes; after that they're managed here.
 * - How often a coupon was used is counted from the orders (cancelled / returned don't count).
 * - The storefront (DASHBOARD_URL) reads publicPricing().
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type { AdminCoupon, CouponInput, CouponSaveResult, CouponStatus, GoldPrice, GoldPriceChange, LocalizedText, PriceSource, PricingState, PublicPricing } from "@/types";
import { mutate, read } from "./mock-db";
import { allOrders } from "./mock-orders";
import { storeConfig } from "@/config/store";
import { getCheckoutSettings } from "./mock-checkout";
import erpPricesJson from "@/mock-data/gold-prices.json";
import couponsJson from "@/mock-data/coupons.json";
import checkoutJson from "@/mock-data/checkout-options.json";

type StoredPricing = Omit<PricingState, "currency">;
const erpPrices = () => (erpPricesJson as GoldPrice[]).map((p) => ({ ...p }));
const sortPrices = (list: GoldPrice[]) => [...list].sort((a, b) => b.karat - a.karat);

function stored(): StoredPricing {
  const existing = read((db) => db.pricing);
  // The karats shown are the ones in the ERP feed (mock-data/gold-prices.json); a karat removed there disappears here too
  const karats = new Set(erpPrices().map((p) => p.karat));
  if (existing && existing.prices.every((p) => karats.has(p.karat))) return existing;
  if (existing)
    return mutate((db) => {
      db.pricing!.prices = db.pricing!.prices.filter((p) => karats.has(p.karat));
      return db.pricing!;
    });
  return mutate(
    (db) =>
      (db.pricing ??= {
        source: "erp",
        prices: sortPrices(erpPrices()),
        lastSyncAt: new Date().toISOString(),
        priceLockMinutes: (checkoutJson as { priceLockMinutes?: number }).priceLockMinutes ?? 15,
        priceChangeTolerancePct: 0,
        history: [],
      }),
  );
}

export const getPricing = (): PricingState => ({ ...stored(), currency: storeConfig.currency });
export const currentGoldPrices = (): GoldPrice[] => stored().prices;

/** Records what changed (only karats whose price moved) and keeps the last 60 changes */
function applyPrices(p: StoredPricing, next: { karat: GoldPrice["karat"]; pricePerGram: number }[], source: PriceSource, by?: LocalizedText) {
  const now = new Date().toISOString();
  const changes: GoldPriceChange[] = [];
  for (const n of next) {
    const cur = p.prices.find((x) => x.karat === n.karat);
    if (cur && cur.pricePerGram === n.pricePerGram) continue;
    changes.push({ at: now, karat: n.karat, from: cur?.pricePerGram ?? 0, to: n.pricePerGram, source, by });
    if (cur) {
      cur.pricePerGram = n.pricePerGram;
      cur.updatedAt = now;
    } else p.prices.push({ karat: n.karat, pricePerGram: n.pricePerGram, currency: storeConfig.currency, updatedAt: now });
  }
  p.prices = sortPrices(p.prices);
  p.history = [...changes, ...p.history].slice(0, 60);
  return changes.length;
}

export function savePricingSettings(settings: { source: PriceSource; priceLockMinutes: number; priceChangeTolerancePct: number }): PricingState {
  mutate((db) => {
    const p = (db.pricing ??= stored());
    Object.assign(p, settings);
  });
  return getPricing();
}

/** Manual prices only — in ERP mode the ERP decides ("erp_source") */
export function saveGoldPrices(prices: { karat: GoldPrice["karat"]; pricePerGram: number }[], by: LocalizedText): { ok: true; changed: number; state: PricingState } | { ok: false; error: "erp_source" } {
  const result = mutate((db) => {
    const p = (db.pricing ??= stored());
    if (p.source === "erp") return null;
    return applyPrices(p, prices, "manual", by);
  });
  return result === null ? { ok: false, error: "erp_source" } : { ok: true, changed: result, state: getPricing() };
}

/** "Sync now": copy the ERP feed (mock-data/gold-prices.json) */
export function syncGoldPrices(): { changed: number; state: PricingState } {
  const changed = mutate((db) => {
    const p = (db.pricing ??= stored());
    const n = applyPrices(p, erpPrices(), "erp");
    p.lastSyncAt = new Date().toISOString();
    return n;
  });
  return { changed, state: getPricing() };
}

/* ---------- coupons ---------- */
function storedCoupons(): (CouponInput & { createdAt: string })[] {
  const existing = read((db) => db.coupons);
  if (existing) return existing;
  return mutate((db) => (db.coupons ??= (couponsJson as unknown as CouponInput[]).map((c) => ({ ...c, createdAt: new Date().toISOString() }))));
}

/** Uses and discount per code, from orders that weren't cancelled or returned */
function usage(): Map<string, { count: number; discount: number }> {
  const m = new Map<string, { count: number; discount: number }>();
  for (const o of allOrders()) {
    if (!o.couponCode || o.status === "cancelled" || o.status === "returned") continue;
    const k = o.couponCode.toUpperCase();
    const u = m.get(k) ?? { count: 0, discount: 0 };
    u.count += 1;
    u.discount += o.discount;
    m.set(k, u);
  }
  return m;
}

function statusOf(c: CouponInput, used: number, now = Date.now()): CouponStatus {
  if (!c.isActive) return "paused";
  if (c.endsAt && Date.parse(c.endsAt) < now) return "expired";
  if (c.usageLimit !== undefined && used >= c.usageLimit) return "used_up";
  if (c.startsAt && Date.parse(c.startsAt) > now) return "scheduled";
  return "active";
}

export function listCoupons(): AdminCoupon[] {
  const u = usage();
  const order: Record<CouponStatus, number> = { active: 0, scheduled: 1, paused: 2, used_up: 3, expired: 4 };
  return storedCoupons()
    .map((c) => {
      const x = u.get(c.code.toUpperCase()) ?? { count: 0, discount: 0 };
      return { ...c, usedCount: x.count, discountGiven: Math.round(x.discount), status: statusOf(c, x.count) };
    })
    .sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt));
}

const find = (code: string) => listCoupons().find((c) => c.code === code.toUpperCase());

export function createCoupon(input: CouponInput): CouponSaveResult {
  const code = input.code.toUpperCase();
  const taken = mutate((db) => {
    const list = (db.coupons ??= storedCoupons());
    if (list.some((c) => c.code.toUpperCase() === code)) return true;
    list.push({ ...input, code, createdAt: new Date().toISOString() });
    return false;
  });
  return taken ? { ok: false, error: "code_taken" } : { ok: true, coupon: find(code)! };
}

/** The code itself can change too (e.g. a typo) — old orders keep the code they used */
export function updateCoupon(code: string, input: CouponInput): CouponSaveResult {
  const next = input.code.toUpperCase();
  const r = mutate((db) => {
    const list = (db.coupons ??= storedCoupons());
    const cur = list.find((c) => c.code.toUpperCase() === code.toUpperCase());
    if (!cur) return "not_found" as const;
    if (next !== cur.code.toUpperCase() && list.some((c) => c.code.toUpperCase() === next)) return "code_taken" as const;
    Object.assign(cur, { ...input, code: next });
    for (const k of ["maxDiscount", "startsAt", "endsAt", "usageLimit", "productIds", "automatic"] as const) if (input[k] === undefined) delete cur[k];
    return null;
  });
  return r ? { ok: false, error: r } : { ok: true, coupon: find(next)! };
}

export function deleteCoupon(code: string): CouponSaveResult {
  const c = find(code);
  if (!c) return { ok: false, error: "not_found" };
  mutate((db) => {
    db.coupons = (db.coupons ?? []).filter((x) => x.code.toUpperCase() !== code.toUpperCase());
  });
  return { ok: true, coupon: c };
}

/* ---------- what the storefront reads ---------- */
export function publicPricing(): PublicPricing {
  const p = stored();
  const u = usage();
  return {
    goldPrices: p.prices,
    // Paused codes are left out; dates and limits are checked by the checkout
    coupons: storedCoupons()
      .filter((c) => c.isActive)
      .map(({ createdAt: _c, ...c }) => ({ ...c, usedCount: u.get(c.code.toUpperCase())?.count ?? 0 })),
    priceLockMinutes: p.priceLockMinutes,
    priceChangeTolerancePct: p.priceChangeTolerancePct,
    // Delivery areas, payment methods, VAT, store pickup (Shipping & payment)
    checkout: { ...getCheckoutSettings(), priceLockMinutes: p.priceLockMinutes, priceChangeTolerancePct: p.priceChangeTolerancePct },
  };
}
