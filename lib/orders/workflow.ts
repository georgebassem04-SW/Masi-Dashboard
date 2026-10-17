/**
 * ORDER WORKFLOW — which status can follow which.
 * ------------------------------------------------------------------
 *   جديد pending ─► مؤكد confirmed ─► قيد التجهيز processing ─┬─► تم الشحن shipped ─► مكتمل delivered ─► مرتجع returned
 *                                                              └─► جاهز للاستلام ready_for_pickup ─► مكتمل delivered
 *   Cancel is possible until the order leaves the store (pending / confirmed / processing / ready_for_pickup).
 *
 * Used by BOTH the order page (to show only valid buttons) and the server (to refuse invalid changes),
 * so a wrong change is impossible even if someone calls the API directly.
 * To change the process (e.g. allow cancelling a shipped order) edit NEXT_STATUSES below.
 */
import type { Order, OrderStatus, PaymentStatus } from "@/types";

export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "ready_for_pickup", "cancelled"],
  shipped: ["delivered", "returned"],
  ready_for_pickup: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/** The steps shown in the progress bar, depending on delivery or store pickup */
export const STEPS: Record<Order["deliveryMethod"], OrderStatus[]> = {
  delivery: ["pending", "confirmed", "processing", "shipped", "delivered"],
  store_pickup: ["pending", "confirmed", "processing", "ready_for_pickup", "delivered"],
};

/** Valid next statuses for this order (shipping vs pickup decides which one appears after "processing") */
export function nextStatuses(order: Pick<Order, "status" | "deliveryMethod">): OrderStatus[] {
  return NEXT_STATUSES[order.status].filter((s) =>
    order.deliveryMethod === "store_pickup" ? s !== "shipped" : s !== "ready_for_pickup",
  );
}

export function canMoveTo(order: Pick<Order, "status" | "deliveryMethod">, to: OrderStatus): boolean {
  return nextStatuses(order).includes(to);
}

/** Changes that need a written reason */
export const REASON_REQUIRED: OrderStatus[] = ["cancelled", "returned"];

/** Payment changes staff can make by hand */
export function nextPaymentStatuses(order: Pick<Order, "paymentStatus" | "status">): PaymentStatus[] {
  switch (order.paymentStatus) {
    case "pending":
    case "awaiting_transfer":
    case "failed":
      return order.status === "cancelled" ? [] : ["paid"];
    case "paid":
      // Money goes back only when the order is cancelled or returned
      return order.status === "cancelled" || order.status === "returned" ? ["refunded"] : [];
    default:
      return [];
  }
}
