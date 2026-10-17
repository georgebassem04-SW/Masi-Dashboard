/**
 * REPORT PERIOD PICKER — Today · 7 days · 30 days · 3 months · 12 months · Custom (from / to dates).
 * Changes the page address (/reports?period=…), the server page recalculates.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReportPeriod, ReportQuery } from "@/types";
import { REPORT_PERIODS, reportQueryString } from "@/lib/reports/period";
import { cn } from "@/lib/utils";

type Labels = { periods: Record<ReportPeriod, string>; periodLabel: string; from: string; to: string; apply: string };

export function PeriodPicker({ query, range, labels }: { query: ReportQuery; range: { from: string; to: string }; labels: Labels }) {
  const router = useRouter();
  const [custom, setCustom] = useState(query.period === "custom");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  return (
    <div className="flex flex-col gap-2">
      <nav aria-label={labels.periodLabel} className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {REPORT_PERIODS.map((p) => {
          const active = p === "custom" ? custom : !custom && query.period === p;
          const cls = cn("flex h-9 shrink-0 items-center rounded-lg px-3.5 text-sm whitespace-nowrap", active ? "bg-card font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground");
          return p === "custom" ? (
            <button key={p} type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cls}>
              {labels.periods[p]}
            </button>
          ) : (
            <Link key={p} href={`/reports${reportQueryString({ period: p })}`} onClick={() => setCustom(false)} aria-current={active ? "page" : undefined} className={cls}>
              {labels.periods[p]}
            </Link>
          );
        })}
      </nav>
      {custom && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) router.push(`/reports${reportQueryString({ period: "custom", from, to })}`);
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            {labels.from}
            <input type="date" required value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
            {labels.to}
            <input type="date" required value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground" />
          </label>
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            {labels.apply}
          </button>
        </form>
      )}
    </div>
  );
}
