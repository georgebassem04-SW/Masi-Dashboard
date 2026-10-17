/**
 * MOCK ORDERS (development only)
 * ------------------------------------------------------------------
 * Only REAL orders are shown: the ones placed on the storefront on your computer — when .env.local has
 *        STOREFRONT_MOCK_DB=../storefront/.mock-db/db.json
 *   (there are no sample orders: place an order on the website to see it here)
 *      Status and payment changes are written back into the storefront's file, so the customer
 *      sees the new status in "My orders" on the website. Staff-only details (notes, history,
 *      tracking number) stay in the dashboard's own .mock-db.
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AdminOrder, Order, OrderEvent, OrderListQuery, OrderListResult, OrderStatus, OrderSummary } from "@/types";
import { mutate, read } from "./mock-db";
import { matchesSearch } from "@/lib/search";

const ALL_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "ready_for_pickup", "shipped", "delivered", "cancelled", "returned"];

/* ---------- storefront orders ---------- */
export const storefrontFile = () => {
  const p = process.env.STOREFRONT_MOCK_DB;
  return p ? path.resolve(process.cwd(), p) : null;
};

function readStorefront(): { orders: Order[] } | null {
  const file = storefrontFile();
  if (!file || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function storefrontOrders(): AdminOrder[] {
  const data = readStorefront();
  if (!data?.orders) return [];
  const extras = read((db) => db.orderExtras);
  return data.orders.map((o) => {
    const x = extras[o.id];
    const created: OrderEvent = { at: o.createdAt, type: "created" };
    return { ...o, events: x?.events ?? [created], trackingNumber: x?.trackingNumber, cancelReason: x?.cancelReason };
  });
}

/** Every order, newest first */
export function allOrders(): AdminOrder[] {
  return storefrontOrders().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findOrder(id: string): AdminOrder | null {
  return allOrders().find((o) => o.id === id || o.number === id) ?? null;
}

/** Saves a changed order back where it came from */
export function saveOrder(order: AdminOrder) {
  // Storefront order: shop fields go back to the storefront's file, staff-only fields stay here
  const file = storefrontFile();
  const data = readStorefront();
  if (!file || !data) return;
  const { events, trackingNumber, cancelReason, ...shopOrder } = order;
  data.orders = data.orders.map((o) => (o.id === order.id ? { ...o, status: shopOrder.status, statusHistory: shopOrder.statusHistory, paymentStatus: shopOrder.paymentStatus } : o));
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  mutate((db) => {
    db.orderExtras[order.id] = { events, trackingNumber, cancelReason };
  });
}

/* ---------- list, search, filters ---------- */
export function toSummary(o: AdminOrder): OrderSummary {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customer.name,
    phone: o.customer.phone,
    city: o.deliveryMethod === "delivery" ? o.shippingAddress?.city : undefined,
    createdAt: o.createdAt,
    itemsCount: o.lines.reduce((s, l) => s + l.quantity, 0),
    total: o.total,
    currency: o.currency,
    status: o.status,
    paymentStatus: o.paymentStatus,
    deliveryMethod: o.deliveryMethod,
  };
}

export function listOrders(q: OrderListQuery): OrderListResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 5000);
  const since = q.period === "today" ? startOfToday() : q.period === "7d" ? Date.now() - 7 * 86400_000 : q.period === "30d" ? Date.now() - 30 * 86400_000 : 0;

  // Filters that apply to the tab counts too
  const base = allOrders().filter((o) => {
    if (since && Date.parse(o.createdAt) < since) return false;
    if (q.payment && o.paymentStatus !== q.payment) return false;
    if (q.delivery && o.deliveryMethod !== q.delivery) return false;
    if (q.q && !matchesSearch(q.q, [o.number, o.customer.name, o.customer.phone, o.customer.email])) return false;
    return true;
  });

  const counts = Object.fromEntries([["all", base.length], ...ALL_STATUSES.map((s) => [s, base.filter((o) => o.status === s).length])]) as OrderListResult["counts"];
  const filtered = q.status ? base.filter((o) => o.status === q.status) : base;
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    total: filtered.length,
    page,
    pageSize,
    counts,
  };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
