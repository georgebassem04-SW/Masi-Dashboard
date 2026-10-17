/**
 * ORDERS LIST FILTERS <-> PAGE ADDRESS
 * The orders list keeps its filters in the address, e.g. /orders?status=pending&period=7d&q=sara&page=2,
 * so a filtered list can be bookmarked, shared with a colleague, and the Back button works.
 *   parseOrderQuery(searchParams) -> OrderListQuery (unknown values are ignored)
 *   orderQueryString(query, changes) -> "?status=…&…" for links
 */
import type { OrderListQuery, OrderPeriod, OrderStatus, PaymentStatus } from "@/types";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "ready_for_pickup", "shipped", "delivered", "cancelled", "returned"];
export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "awaiting_transfer", "paid", "failed", "refunded"];
export const PERIODS: OrderPeriod[] = ["today", "7d", "30d", "all"];
export const PAGE_SIZE = 20;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseOrderQuery(raw: Raw): OrderListQuery {
  const status = one(raw.status) as OrderStatus;
  const payment = one(raw.payment) as PaymentStatus;
  const period = one(raw.period) as OrderPeriod;
  const delivery = one(raw.delivery);
  const page = Math.floor(Number(one(raw.page)) || 1);
  return {
    status: ORDER_STATUSES.includes(status) ? status : undefined,
    payment: PAYMENT_STATUSES.includes(payment) ? payment : undefined,
    period: PERIODS.includes(period) ? period : undefined,
    delivery: delivery === "delivery" || delivery === "store_pickup" ? delivery : undefined,
    q: one(raw.q).trim().slice(0, 80) || undefined,
    page: page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
  };
}

export function orderQueryString(q: OrderListQuery, changes: Partial<OrderListQuery> = {}): string {
  const merged = { ...q, ...changes };
  const params = new URLSearchParams();
  if (merged.status) params.set("status", merged.status);
  if (merged.q) params.set("q", merged.q);
  if (merged.period) params.set("period", merged.period);
  if (merged.payment) params.set("payment", merged.payment);
  if (merged.delivery) params.set("delivery", merged.delivery);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
