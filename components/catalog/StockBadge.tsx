/**
 * STOCK BADGE — متوفر (green) · كمية محدودة (amber) · نفد (red) · حسب الطلب (blue)
 * Texts: dictionaries → "products.stock". "Limited" = 2 pieces or fewer (lib/catalog/helpers.ts → LOW_STOCK_AT).
 */
import type { ProductStock } from "@/types";
import { cn } from "@/lib/utils";

const tone: Record<ProductStock, string> = {
  in_stock: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  low_stock: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  out_of_stock: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
  made_to_order: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
};

export function StockBadge({ stock, label, extra }: { stock: ProductStock; label: string; extra?: string }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tone[stock])}>
      {label}
      {extra && <span className="font-normal opacity-80"> · {extra}</span>}
    </span>
  );
}
