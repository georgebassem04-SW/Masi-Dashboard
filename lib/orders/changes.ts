/**
 * ORDER CHANGES — the rules for changing an order, in one place.
 * Each function takes an order and returns the changed copy (or an error). Used by the sample-data
 * API (lib/api/mock.ts); the real API must apply the same rules on its side.
 */
import type { AdminOrder, LocalizedText, OrderStatus, OrderUpdateResult, PaymentStatus } from "@/types";
import { canMoveTo, nextPaymentStatuses, REASON_REQUIRED } from "./workflow";

export function changeStatus(
  order: AdminOrder,
  to: OrderStatus,
  opts: { note?: string; trackingNumber?: string; by: LocalizedText },
): OrderUpdateResult {
  if (!canMoveTo(order, to)) return { ok: false, error: "invalid_transition" };
  const note = opts.note?.trim();
  if (REASON_REQUIRED.includes(to) && !note) return { ok: false, error: "reason_required" };

  const at = new Date().toISOString();
  const tracking = opts.trackingNumber?.trim();
  const next: AdminOrder = {
    ...order,
    status: to,
    statusHistory: [...order.statusHistory, { status: to, at }],
    events: [...order.events, { at, type: "status", status: to, note, by: opts.by }],
  };
  if (to === "cancelled") next.cancelReason = note;
  if (tracking) {
    next.trackingNumber = tracking;
    next.events.push({ at, type: "tracking", note: tracking, by: opts.by });
  }
  // Cash on delivery / pay in store: delivered = money received
  if (to === "delivered" && (order.paymentMethod === "cash_on_delivery" || order.paymentMethod === "pay_in_store") && order.paymentStatus === "pending") {
    next.paymentStatus = "paid";
    next.events.push({ at, type: "payment", paymentStatus: "paid", by: opts.by });
  }
  return { ok: true, order: next };
}

export function changePayment(order: AdminOrder, to: PaymentStatus, by: LocalizedText): OrderUpdateResult {
  if (!nextPaymentStatuses(order).includes(to)) return { ok: false, error: "invalid_transition" };
  const at = new Date().toISOString();
  return { ok: true, order: { ...order, paymentStatus: to, events: [...order.events, { at, type: "payment", paymentStatus: to, by }] } };
}

export function addNote(order: AdminOrder, note: string, by: LocalizedText): OrderUpdateResult {
  const text = note.trim();
  if (!text) return { ok: false, error: "reason_required" };
  return { ok: true, order: { ...order, events: [...order.events, { at: new Date().toISOString(), type: "note", note: text.slice(0, 1000), by }] } };
}
