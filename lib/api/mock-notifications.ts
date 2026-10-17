/**
 * MOCK NOTIFICATIONS (development only)
 * ------------------------------------------------------------------
 * Nothing is stored for the notifications themselves: they're worked out from the data every time
 *   new order / waiting for confirmation / cancelled by the customer  <- orders
 *   new contact message                                               <- Contact messages
 *   new customization request ("Design your piece")                   <- Customization requests
 *   out of stock / low stock                                          <- products (visible ones)
 *   new customer account                                              <- customers
 *   gold prices updated by the ERP                                    <- gold price history
 * Only "read" marks and each person's switched-off kinds are saved (.mock-db → notificationState).
 * Rules and numbers: config/notifications.ts. With the real API (DATA_SOURCE=http) the API sends the list.
 */
import "server-only";
import type { AdminNotification, NotificationList, NotificationQuery, NotificationType } from "@/types";
import { hasAccess, type Permissions } from "@/lib/auth/permissions";
import { LOOKBACK_DAYS, NOTIFICATION_KINDS, ORDER_WAITING_HOURS } from "@/config/notifications";
import { productStock } from "@/lib/catalog/helpers";
import { mutate, read } from "./mock-db";
import { allOrders } from "./mock-orders";
import { allMessages } from "./mock-inbox";
import { allCustomRequests } from "./mock-custom";
import { allCustomers } from "./mock-customers";
import { allProducts } from "./mock-catalog";
import { getPricing } from "./mock-pricing";

type Raw = Omit<AdminNotification, "read">;
const HOUR = 3600_000;

/** Everything that happened recently, newest first (before permissions / read marks) */
function build(): Raw[] {
  const since = Date.now() - LOOKBACK_DAYS * 24 * HOUR;
  const recent = (iso: string) => Date.parse(iso) >= since && Date.parse(iso) <= Date.now();
  const out: Raw[] = [];

  for (const o of allOrders()) {
    const href = `/orders/${encodeURIComponent(o.number)}`;
    const base = { number: o.number, name: o.customer.name, total: o.total, currency: o.currency };
    if (recent(o.createdAt)) out.push({ id: `order:${o.number}`, type: "new_order", createdAt: o.createdAt, params: base, href });
    // Still not confirmed after N hours
    const due = Date.parse(o.createdAt) + ORDER_WAITING_HOURS * HOUR;
    if (o.status === "pending" && due <= Date.now() && due >= since) out.push({ id: `waiting:${o.number}`, type: "order_waiting", createdAt: new Date(due).toISOString(), params: { ...base, hours: ORDER_WAITING_HOURS }, href });
    // Cancelled by the customer (no staff name on the change)
    const cancel = o.events.find((e) => e.type === "status" && e.status === "cancelled" && !e.by);
    if (cancel && recent(cancel.at)) out.push({ id: `cancelled:${o.number}`, type: "order_cancelled", createdAt: cancel.at, params: { ...base, reason: cancel.note ?? o.cancelReason ?? "" }, href });
  }

  for (const m of allMessages()) {
    if (recent(m.createdAt)) out.push({ id: `message:${m.id}`, type: "new_message", createdAt: m.createdAt, params: { name: m.name, reference: m.reference, subject: m.subject }, href: `/inbox?m=${encodeURIComponent(m.id)}` });
  }

  for (const r of allCustomRequests()) {
    if (recent(r.createdAt)) out.push({ id: `custom:${r.id}`, type: "new_custom", createdAt: r.createdAt, params: { name: r.name, reference: r.reference, type: r.pieceType }, href: `/custom-requests?r=${encodeURIComponent(r.id)}` });
  }

  for (const p of allProducts()) {
    if (!p.visible) continue;
    const { qty, stock } = productStock(p);
    if (stock !== "out_of_stock" && stock !== "low_stock") continue;
    // The id carries the quantity: when stock changes again, it's a new notification
    out.push({
      id: `stock:${p.id}:${qty}`,
      type: stock,
      createdAt: recent(p.updatedAt) ? p.updatedAt : new Date(since).toISOString(),
      params: { name: p.name.ar, nameEn: p.name.en, sku: p.sku, qty },
      href: `/products/${encodeURIComponent(p.id)}`,
    });
  }

  for (const c of allCustomers()) {
    if (c.kind === "registered" && recent(c.createdAt)) out.push({ id: `customer:${c.id}`, type: "new_customer", createdAt: c.createdAt, params: { name: c.name, city: c.city ?? "" }, href: `/customers/${encodeURIComponent(c.id)}` });
  }

  // One notification per ERP price update (all karats that moved together)
  const byTime = new Map<string, { karat: number; from: number; to: number }[]>();
  for (const h of getPricing().history) if (h.source === "erp" && recent(h.at)) byTime.set(h.at, [...(byTime.get(h.at) ?? []), h]);
  for (const [at, changes] of byTime) {
    const main = changes.find((c) => c.karat === 21) ?? changes[0];
    out.push({ id: `gold:${at}`, type: "gold_price", createdAt: at, params: { karat: main.karat, from: main.from, to: main.to, count: changes.length }, href: "/pricing" });
  }

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function stateOf(staffId: string) {
  return read((db) => db.notificationState[staffId]) ?? { readIds: [] as string[], off: [] as NotificationType[] };
}

/** Kinds this person may get (by permissions) */
export const availableTypes = (permissions: Permissions) => NOTIFICATION_KINDS.filter((k) => hasAccess(permissions, k.permission)).map((k) => k.type);

export function listNotifications(staffId: string, permissions: Permissions, q: NotificationQuery): NotificationList {
  const state = stateOf(staffId);
  const available = availableTypes(permissions);
  const on = new Set(available.filter((t) => !state.off.includes(t)));
  const readIds = new Set(state.readIds);
  const isRead = (n: Raw) => readIds.has(n.id) || (!!state.readAllAt && n.createdAt <= state.readAllAt);
  const mine = build()
    .filter((n) => on.has(n.type))
    .map((n) => ({ ...n, read: isRead(n) }));

  const unreadByType: NotificationList["unreadByType"] = {};
  for (const n of mine) if (!n.read) unreadByType[n.type] = (unreadByType[n.type] ?? 0) + 1;
  const filtered = mine.filter((n) => (!q.type || n.type === q.type) && (q.filter !== "unread" || !n.read));
  const pageSize = Math.min(Math.max(q.pageSize ?? 30, 1), 100);
  const page = Math.max(q.page ?? 1, 1);
  return {
    items: filtered.slice(0, page * pageSize), // "Show more" adds the next page under the current ones
    total: filtered.length,
    unread: mine.filter((n) => !n.read).length,
    unreadByType,
    available,
    off: state.off.filter((t) => available.includes(t)),
    page,
    pageSize,
  };
}

/** ids = these ones · "all" = everything up to now */
export function markRead(staffId: string, ids: string[] | "all") {
  mutate((db) => {
    const s = (db.notificationState[staffId] ??= { readIds: [], off: [] });
    if (ids === "all") {
      s.readAllAt = new Date().toISOString();
      s.readIds = [];
    } else s.readIds = [...new Set([...ids, ...s.readIds])].slice(0, 1000);
  });
}

/** Kinds this person switched off for themselves */
export function setOffTypes(staffId: string, off: NotificationType[]) {
  mutate((db) => {
    const s = (db.notificationState[staffId] ??= { readIds: [], off: [] });
    s.off = [...new Set(off)];
  });
}
