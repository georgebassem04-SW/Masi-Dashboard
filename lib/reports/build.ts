/**
 * SALES REPORT CALCULATION — the rules behind every number on the Reports page.
 * Used by the sample-data mode (lib/api/mock.ts). The real API must return the same numbers
 * with the same rules, so this file doubles as the specification for the API team:
 *
 *   - An order belongs to the day it was PLACED (store time zone).
 *   - "Sales" = orders that are not cancelled and not returned (pending ones included).
 *     Sales amount = order total (items − discount + VAT + shipping).
 *   - Gold sold = weight × quantity of every piece in those orders.
 *   - Gold value / making / stones come from the prices saved in each order line (price at order time).
 *   - Cancelled and returned orders are counted separately, never in sales.
 *   - New customer = their first order ever is in this period (matched by account, else phone number).
 */
import type { AdminOrder, LocalizedText, ReportQuery, SalesReport, SalesTotals } from "@/types";
import { dayKey, resolveRange } from "./period";

const counts = (o: AdminOrder) => o.status !== "cancelled" && o.status !== "returned";
const round = (n: number) => Math.round(n);

function totalsOf(orders: AdminOrder[]): SalesTotals {
  const t: SalesTotals = { sales: 0, orders: 0, averageOrder: 0, pieces: 0, goldGrams: 0, goldValue: 0, making: 0, stones: 0, discounts: 0, vat: 0, shipping: 0 };
  for (const o of orders) {
    t.sales += o.total;
    t.orders += 1;
    t.discounts += o.discount;
    t.vat += o.vat;
    t.shipping += o.shipping;
    for (const l of o.lines) {
      t.pieces += l.quantity;
      t.goldGrams += l.weightGrams * l.quantity;
      t.goldValue += l.goldPricePerGram * l.weightGrams * l.quantity;
      t.making += l.makingCharge * l.quantity;
      t.stones += l.stonesPrice * l.quantity;
    }
  }
  t.averageOrder = t.orders ? t.sales / t.orders : 0;
  for (const k of Object.keys(t) as (keyof SalesTotals)[]) t[k] = k === "goldGrams" ? Math.round(t[k] * 10) / 10 : round(t[k]);
  return t;
}

const personKey = (o: AdminOrder) => o.customerId ?? `tel:${o.customer.phone.replace(/\D/g, "").slice(-9)}`;

export function buildSalesReport(
  allOrders: AdminOrder[],
  query: ReportQuery,
  options: { currency: string; categoryOf: (productId: string) => { id: string; name: LocalizedText } | undefined; now?: Date },
): SalesReport {
  const range = resolveRange(query, options.now);
  const withDay = allOrders.map((o) => ({ o, day: dayKey(o.createdAt) }));
  const inRange = withDay.filter((x) => x.day >= range.from && x.day <= range.to);
  const orders = inRange.map((x) => x.o);
  const sold = orders.filter(counts);
  const previous = withDay.filter((x) => x.day >= range.prevFrom && x.day <= range.prevTo && counts(x.o)).map((x) => x.o);

  // Chart
  const bucketOf = (day: string) => (range.groupBy === "day" ? day : day.slice(0, 7));
  const series = new Map(range.buckets.map((k) => [k, { key: k, sales: 0, orders: 0, goldGrams: 0 }]));
  for (const { o, day } of inRange) {
    if (!counts(o)) continue;
    const b = series.get(bucketOf(day));
    if (!b) continue;
    b.sales += o.total;
    b.orders += 1;
    b.goldGrams += o.lines.reduce((s, l) => s + l.weightGrams * l.quantity, 0);
  }

  // Products, categories, karats (line totals, before order discount / VAT)
  const products = new Map<string, SalesReport["topProducts"][number]>();
  const categories = new Map<string, SalesReport["byCategory"][number]>();
  const karats = new Map<number, SalesReport["byKarat"][number]>();
  for (const o of sold) {
    for (const l of o.lines) {
      const p = products.get(l.productId) ?? { productId: l.productId, name: l.name, imageUrl: l.imageUrl, pieces: 0, sales: 0 };
      p.pieces += l.quantity;
      p.sales += l.lineTotal;
      products.set(l.productId, p);

      const cat = options.categoryOf(l.productId) ?? { id: "other", name: { ar: "أخرى", en: "Other" } };
      const c = categories.get(cat.id) ?? { ...cat, sales: 0, pieces: 0 };
      c.sales += l.lineTotal;
      c.pieces += l.quantity;
      categories.set(cat.id, c);

      const k = karats.get(l.karat) ?? { karat: l.karat, grams: 0, pieces: 0, sales: 0 };
      k.grams += l.weightGrams * l.quantity;
      k.pieces += l.quantity;
      k.sales += l.lineTotal;
      karats.set(l.karat, k);
    }
  }

  const group = <K extends string>(list: AdminOrder[], keyOf: (o: AdminOrder) => K | undefined) => {
    const m = new Map<K, { orders: number; sales: number }>();
    for (const o of list) {
      const k = keyOf(o);
      if (!k) continue;
      const g = m.get(k) ?? { orders: 0, sales: 0 };
      g.orders += 1;
      g.sales += o.total;
      m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => b[1].sales - a[1].sales);
  };

  // New vs returning: first order ever (any status except cancelled)
  const firstDay = new Map<string, string>();
  for (const { o, day } of withDay) {
    if (o.status === "cancelled") continue;
    const k = personKey(o);
    if (!firstDay.has(k) || day < firstDay.get(k)!) firstDay.set(k, day);
  }
  const people = new Set(sold.map(personKey));
  let newCustomers = 0;
  for (const p of people) if ((firstDay.get(p) ?? "") >= range.from) newCustomers += 1;

  const coupons = new Map<string, { code: string; orders: number; discount: number }>();
  for (const o of sold) {
    if (!o.couponCode) continue;
    const c = coupons.get(o.couponCode) ?? { code: o.couponCode, orders: 0, discount: 0 };
    c.orders += 1;
    c.discount += o.discount;
    coupons.set(o.couponCode, c);
  }

  const byStatus: SalesReport["byStatus"] = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  const sum = (list: AdminOrder[]) => round(list.reduce((s, o) => s + o.total, 0));
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const returned = orders.filter((o) => o.status === "returned");

  return {
    currency: options.currency,
    from: range.from,
    to: range.to,
    groupBy: range.groupBy,
    totals: totalsOf(sold),
    previous: totalsOf(previous),
    series: [...series.values()].map((b) => ({ ...b, sales: round(b.sales), goldGrams: Math.round(b.goldGrams * 10) / 10 })),
    byCategory: [...categories.values()].map((c) => ({ ...c, sales: round(c.sales) })).sort((a, b) => b.sales - a.sales),
    byKarat: [...karats.values()].map((k) => ({ ...k, grams: Math.round(k.grams * 10) / 10, sales: round(k.sales) })).sort((a, b) => b.karat - a.karat),
    topProducts: [...products.values()].map((p) => ({ ...p, sales: round(p.sales) })).sort((a, b) => b.pieces - a.pieces || b.sales - a.sales).slice(0, 8),
    byStatus,
    byPayment: group(sold, (o) => o.paymentMethod).map(([method, g]) => ({ method, orders: g.orders, sales: round(g.sales) })),
    byDelivery: group(sold, (o) => o.deliveryMethod).map(([method, g]) => ({ method, orders: g.orders, sales: round(g.sales) })),
    topCities: group(sold, (o) => (o.deliveryMethod === "delivery" ? o.shippingAddress?.city : undefined)).slice(0, 6).map(([city, g]) => ({ city, orders: g.orders, sales: round(g.sales) })),
    coupons: [...coupons.values()].map((c) => ({ ...c, discount: round(c.discount) })).sort((a, b) => b.orders - a.orders),
    customers: { new: newCustomers, returning: people.size - newCustomers },
    cancelled: { orders: cancelled.length, value: sum(cancelled) },
    returned: { orders: returned.length, value: sum(returned) },
  };
}
