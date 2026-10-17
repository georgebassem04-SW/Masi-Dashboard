/**
 * REPORT PERIODS — turns "last 30 days" into exact days, in the STORE's time zone (config/store.ts → timeZone).
 *   today · 7d · 30d · 90d  -> one chart bar per day
 *   12m                     -> the last 12 months (this month included), one bar per month
 *   custom                  -> any from/to; per day up to 92 days, per month above that
 * The "previous" period is the same length just before (used for +/- % on the numbers).
 * Also reads/writes the period in the page address: /reports?period=custom&from=2026-01-01&to=2026-03-31
 */
import type { ReportPeriod, ReportQuery } from "@/types";
import { storeConfig } from "@/config/store";

export const REPORT_PERIODS: ReportPeriod[] = ["today", "7d", "30d", "90d", "12m", "custom"];

/** "2026-09-30" for an ISO time, in the store's time zone */
export function dayKey(iso: string | Date, timeZone = storeConfig.timeZone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

const addDays = (key: string, days: number) => new Date(Date.parse(`${key}T00:00:00Z`) + days * 86400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
const isDay = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

function monthStart(key: string, monthsBack: number) {
  const d = new Date(`${key.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - monthsBack);
  return d.toISOString().slice(0, 10);
}

export interface ResolvedRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  groupBy: "day" | "month";
  /** The bars of the chart, in order: "2026-09-30" (day) or "2026-09" (month) */
  buckets: string[];
}

export function resolveRange(q: ReportQuery, now: Date = new Date()): ResolvedRange {
  const today = dayKey(now);
  let from: string;
  let to = today;
  let groupBy: "day" | "month" = "day";

  if (q.period === "custom" && isDay(q.from) && isDay(q.to)) {
    [from, to] = q.from! <= q.to! ? [q.from!, q.to!] : [q.to!, q.from!];
    if (to > today) to = today;
    if (from > to) from = to;
    if (daysBetween(from, to) > 92) groupBy = "month";
  } else if (q.period === "12m") {
    from = monthStart(today, 11);
    groupBy = "month";
  } else {
    const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[q.period as "today"] ?? 30;
    from = addDays(today, -(days - 1));
  }

  const length = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = groupBy === "month" && q.period === "12m" ? monthStart(from, 12) : addDays(prevTo, -(length - 1));

  const buckets: string[] = [];
  if (groupBy === "day") {
    for (let k = from; k <= to; k = addDays(k, 1)) buckets.push(k);
  } else {
    for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = monthStart(`${m}-01`, -1).slice(0, 7)) buckets.push(m);
  }
  return { from, to, prevFrom, prevTo, groupBy, buckets };
}

/* ---------- page address ---------- */
type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseReportQuery(raw: Raw): ReportQuery {
  const period = one(raw.period) as ReportPeriod;
  const from = one(raw.from);
  const to = one(raw.to);
  if (period === "custom" && isDay(from) && isDay(to)) return { period, from, to };
  return { period: REPORT_PERIODS.includes(period) && period !== "custom" ? period : "30d" };
}

export function reportQueryString(q: ReportQuery): string {
  const p = new URLSearchParams({ period: q.period });
  if (q.period === "custom" && q.from && q.to) {
    p.set("from", q.from);
    p.set("to", q.to);
  }
  return `?${p}`;
}
