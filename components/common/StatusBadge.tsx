/**
 * ORDER STATUS BADGE — coloured pill: جديد (blue), قيد التجهيز (amber), تم الشحن (teal), مكتمل (green), ملغي (red).
 *   - Colours -> globals.css → --status-*
 *   - Texts   -> dictionaries → "status"
 */
import type { OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

const tone: Record<OrderStatus, string> = {
  pending: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  confirmed: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  processing: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  ready_for_pickup: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  shipped: "bg-[var(--status-shipped-bg)] text-[var(--status-shipped-fg)]",
  delivered: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  cancelled: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
  returned: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tone[status])}>{label}</span>;
}
