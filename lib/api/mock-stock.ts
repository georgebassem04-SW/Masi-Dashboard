/**
 * MOCK STOCK FOLLOWS ORDERS (development only)
 * ------------------------------------------------------------------
 * When a customer orders on the website, the pieces leave the stock here; when the order is cancelled
 * or returned, they come back. Works even if the dashboard was closed when the order was placed:
 * every time products are read, new / changed website orders are applied once.
 *
 *   order placed (any status except cancelled / returned)  -> stock − quantity
 *   order cancelled or returned                            -> stock + quantity (once)
 *   "made to order" sizes                                  -> not counted
 *
 * What was applied is remembered per order in .mock-db → stockLedger, so nothing is counted twice.
 * With the real API (DATA_SOURCE=http) the API / ERP does this itself.
 */
import "server-only";
import type { AdminProduct, OrderStatus } from "@/types";
import { variantStatus } from "@/lib/catalog/helpers";
import { mutate, read } from "./mock-db";
import { allOrders } from "./mock-orders";

/** Statuses that give the pieces back */
const RETURNS_STOCK: OrderStatus[] = ["cancelled", "returned"];

type Line = { productId: string; variantId: string; qty: number };

/** Adds `sign × qty` to each line's size and recalculates its stock label */
export function moveStock(products: AdminProduct[], lines: Line[], sign: 1 | -1) {
  const now = new Date().toISOString();
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId);
    const v = p?.variants.find((x) => x.id === l.variantId);
    if (!p || !v || v.stockStatus === "made_to_order") continue;
    v.stockQty = Math.max(0, v.stockQty + sign * l.qty);
    v.stockStatus = variantStatus(v.stockQty);
    p.updatedAt = now; // shows in the low / out-of-stock notifications as "just now"
  }
}

/** Apply website orders that weren't counted yet, and give back stock of newly cancelled / returned ones */
export function applyOrderStock() {
  const orders = allOrders();
  const ledger = read((db) => db.stockLedger);
  const todo = orders.filter((o) => {
    const e = ledger[o.id];
    const back = RETURNS_STOCK.includes(o.status);
    return !e || (back && !e.restored);
  });
  if (!todo.length) return;
  mutate((db) => {
    const products = db.products ?? [];
    for (const o of todo) {
      const back = RETURNS_STOCK.includes(o.status);
      const e = db.stockLedger[o.id];
      if (!e) {
        // New order: cancelled before we ever saw it -> nothing to take or give back
        const lines = back ? [] : o.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.quantity }));
        moveStock(products, lines, -1);
        db.stockLedger[o.id] = { lines, restored: back };
      } else if (back && !e.restored) {
        moveStock(products, e.lines, 1);
        e.restored = true;
      }
    }
  });
}

/** After "Sync with ERP" (the pretend ERP file doesn't know website sales): take the open orders off again */
export function reapplyOpenOrders(products: AdminProduct[], ledger: Record<string, { lines: Line[]; restored: boolean }>) {
  for (const e of Object.values(ledger)) if (!e.restored) moveStock(products, e.lines, -1);
}
