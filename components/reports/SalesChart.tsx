/**
 * SALES BAR CHART — one bar per day (or per month). Plain HTML/CSS, no chart library needed.
 * Hover (desktop) or tap/focus (phone, keyboard) a bar to see the amount and number of orders.
 * Colours: gold bars (globals.css → --gold). Height scale: rounded "nice" top value with 4 grid lines.
 * (Client component only so a tap on a phone keeps the bar's value open — iPhones don't focus buttons on tap.)
 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ChartBar {
  key: string;
  /** Full label in the tooltip, e.g. "الثلاثاء 29 سبتمبر" */
  label: string;
  /** Short label under the bar ("" = none, to avoid crowding) */
  short: string;
  value: number;
  valueText: string;
  ordersText: string;
}

/** 1 234 567 -> "1.2M", 45 000 -> "45K" */
function compact(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function niceTop(max: number) {
  if (max <= 0) return 1;
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / step;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * step;
}

export function SalesChart({ bars, locale, emptyText }: { bars: ChartBar[]; locale: "ar" | "en"; emptyText: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(0, ...bars.map((b) => b.value));
  if (max === 0) return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">{emptyText}</p>;
  const top = niceTop(max);
  const ticks = [1, 0.75, 0.5, 0.25];
  const many = bars.length > 16;

  return (
    <div className="flex gap-2">
      {/* Y axis */}
      <div className="flex h-56 shrink-0 flex-col justify-between pb-6 text-[11px] text-muted-foreground" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="-translate-y-1.5 leading-none">
            {compact(top * t, locale)}
          </span>
        ))}
        <span className="leading-none">0</span>
      </div>
      <div className="relative min-w-0 flex-1">
        {/* Grid lines */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex h-50 flex-col justify-between" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="border-t border-dashed border-border" />
          ))}
          <span className="border-t border-border" />
        </div>
        <ol className={cn("relative flex h-56 items-end", many ? "gap-[2px]" : "gap-1.5 sm:gap-3")}>
          {bars.map((b) => (
            <li key={b.key} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <button
                type="button"
                onClick={() => setActive(active === b.key ? null : b.key)}
                onBlur={() => setActive(null)}
                aria-expanded={active === b.key}
                aria-label={`${b.label}: ${b.valueText} · ${b.ordersText}`}
                className="flex h-50 w-full items-end justify-center outline-none"
              >
                <span
                  className={cn("w-full max-w-10 rounded-t-[4px] bg-gold/75 transition-colors group-hover:bg-gold group-focus-within:bg-gold", active === b.key && "bg-gold")}
                  style={{ height: `${Math.max((b.value / top) * 100, b.value > 0 ? 1.5 : 0)}%` }}
                />
              </button>
              <span className="mt-1.5 h-4.5 truncate text-[11px] leading-none text-muted-foreground">{b.short}</span>
              {/* Tooltip */}
              <span
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-48 flex-col items-center rounded-lg bg-foreground px-2.5 py-1.5 text-center text-xs text-background shadow-lg group-hover:flex group-focus-within:flex",
                  active === b.key && "flex",
                )}
              >
                <span className="font-semibold">{b.valueText}</span>
                <span className="opacity-80">{b.label}</span>
                <span className="opacity-80">{b.ordersText}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
