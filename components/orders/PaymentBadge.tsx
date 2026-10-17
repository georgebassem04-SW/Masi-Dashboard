/**
 * PAYMENT BADGE — small coloured label: مدفوع (green), غير مدفوع / بانتظار التحويل (amber), مسترد (grey), فشل (red).
 * Texts: dictionaries → "orders.paymentStatus"
 */
import type { PaymentStatus } from "@/types";
import { cn } from "@/lib/utils";

const tone: Record<PaymentStatus, string> = {
  paid: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  pending: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  awaiting_transfer: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  failed: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
  refunded: "bg-muted text-muted-foreground",
};

export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tone[status])}>{label}</span>;
}
