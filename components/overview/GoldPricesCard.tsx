/**
 * GOLD PRICES TODAY — one box per karat, with the time of the last update from the ERP.
 * "Manage prices" links to /pricing (only for staff with the pricing permission).
 */
import Link from "next/link";
import type { GoldPrice, Locale } from "@/types";
import { fill, formatDateTime, formatMoney } from "@/lib/format";
import { Card } from "@/components/common/Card";

export function GoldPricesCard({
  prices,
  locale,
  labels,
  canManage,
}: {
  prices: GoldPrice[];
  locale: Locale;
  labels: { goldToday: string; karat: string; perGram: string; updated: string; managePrices: string };
  canManage: boolean;
}) {
  const sorted = [...prices].sort((a, b) => b.karat - a.karat);
  const latest = sorted.map((p) => p.updatedAt).sort().at(-1);
  return (
    <Card title={labels.goldToday} action={<span className="rounded-full bg-[var(--status-done-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--status-done-fg)]">ERP</span>}>
      <div className="grid grid-cols-2 gap-2.5 px-5">
        {sorted.map((p) => (
          <div key={p.karat} className="flex flex-col rounded-lg bg-muted px-3 py-2.5">
            <span className="text-xs text-muted-foreground">{fill(labels.karat, { karat: p.karat })}</span>
            <span className="font-bold">{formatMoney(p.pricePerGram, p.currency, locale)}</span>
            <span className="text-[11px] text-muted-foreground">{labels.perGram}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-5 pt-3 pb-4 text-sm">
        {latest && <span className="text-xs text-muted-foreground">{fill(labels.updated, { time: formatDateTime(latest, locale) })}</span>}
        {canManage && (
          <Link href="/pricing" className="font-semibold text-gold hover:underline">
            {labels.managePrices}
          </Link>
        )}
      </div>
    </Card>
  );
}
