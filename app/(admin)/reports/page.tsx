/**
 * PAGE: /reports — SALES REPORTS (design screen 18)
 * ------------------------------------------------------------------
 *   [period: today · 7 days · 30 days · 3 months · 12 months · custom]          [Export Excel]
 *   [total sales] [orders] [average order] [gold sold]      (each with ± % vs the previous period)
 *   [sales chart per day / month]                            [sales breakdown: gold · making · stones · VAT …]
 *   [by category]  [by karat]  [best sellers]
 *   [orders by status] [payment] [delivery & pickup] [cities] [coupons] [new vs returning] [cancelled & returned]
 * Data: api.getSalesReport(). Calculation rules: lib/reports/build.ts. Periods & time zone: lib/reports/period.ts
 *   - Texts: dictionaries → "reports"
 * Needs permission "reports" (view).
 */
import type { Metadata } from "next";
import { Download } from "lucide-react";
import type { Locale } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatMoney, formatNumber, t } from "@/lib/format";
import { parseReportQuery, reportQueryString } from "@/lib/reports/period";
import { storeConfig } from "@/config/store";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common/Card";
import { NoAccess } from "@/components/common/NoticePage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PeriodPicker } from "@/components/reports/PeriodPicker";
import { SalesChart, type ChartBar } from "@/components/reports/SalesChart";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.reports };
}

const intl = (locale: Locale) => (locale === "ar" ? "ar-EG" : "en-US");
const utc = (key: string) => new Date(key.length === 7 ? `${key}-01T12:00:00Z` : `${key}T12:00:00Z`);

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const session = await requireStaff();
  if (!can(session, "reports")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.reports;
  const query = parseReportQuery(await searchParams);
  const r = await api.getSalesReport(query, session.token);

  const money = (n: number) => formatMoney(n, r.currency, locale);
  const num = (n: number) => formatNumber(n, locale);
  const dateFmt = (key: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", ...opts }).format(utc(key));
  const rangeText = fill(d.range, { from: dateFmt(r.from, { day: "numeric", month: "short", year: "numeric" }), to: dateFmt(r.to, { day: "numeric", month: "short", year: "numeric" }) });

  // Chart labels: months → "سبت"; days → weekday for a week, day number otherwise (every few days when crowded)
  const bars: ChartBar[] = r.series.map((b, i) => {
    const isMonth = r.groupBy === "month";
    const every = r.series.length > 45 ? 10 : r.series.length > 16 ? 5 : 1;
    const short = isMonth
      ? dateFmt(b.key, { month: "short" })
      : r.series.length <= 7
        ? dateFmt(b.key, { weekday: "short" })
        : i % every === 0 || i === r.series.length - 1
          ? dateFmt(b.key, { day: "numeric" })
          : "";
    return {
      key: b.key,
      label: isMonth ? dateFmt(b.key, { month: "long", year: "numeric" }) : dateFmt(b.key, { weekday: "long", day: "numeric", month: "long" }),
      short,
      value: b.sales,
      valueText: money(b.sales),
      ordersText: fill(d.chart.orders, { n: num(b.orders) }),
    };
  });

  const itemsTotal = r.totals.goldValue + r.totals.making + r.totals.stones;
  const catTotal = r.byCategory.reduce((s, c) => s + c.sales, 0) || 1;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {/* ===== Period + export ===== */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <PeriodPicker key={`${query.period}-${r.from}-${r.to}`} query={query} range={{ from: r.from, to: r.to }} labels={{ periods: d.periods, periodLabel: d.periodLabel, from: d.from, to: d.to, apply: d.apply }} />
          <span className="text-sm text-muted-foreground">{rangeText}</span>
        </div>
        <a href={`/api/reports/export${reportQueryString(query)}`} className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted">
          <Download className="size-4" />
          {d.export}
        </a>
      </div>

      {/* ===== Numbers ===== */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={d.kpi.sales} value={money(r.totals.sales)} now={r.totals.sales} before={r.previous.sales} d={d} locale={locale} />
        <Kpi label={d.kpi.orders} value={num(r.totals.orders)} now={r.totals.orders} before={r.previous.orders} d={d} locale={locale} />
        <Kpi label={d.kpi.average} value={money(r.totals.averageOrder)} now={r.totals.averageOrder} before={r.previous.averageOrder} d={d} locale={locale} />
        <Kpi
          label={d.kpi.gold}
          value={`${num(r.totals.goldGrams)} ${d.kpi.grams}`}
          extra={fill(d.kpi.pieces, { n: num(r.totals.pieces) })}
          now={r.totals.goldGrams}
          before={r.previous.goldGrams}
          d={d}
          locale={locale}
        />
      </div>

      {/* ===== Chart + breakdown ===== */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title={`${d.chart.title} (${r.groupBy === "month" ? d.chart.byMonth : d.chart.byDay})`}>
          <div className="flex flex-col gap-2 px-5 pb-5">
            <SalesChart bars={bars} locale={locale} emptyText={d.chart.empty} />
            <p className="text-xs text-muted-foreground">{d.chart.hint}</p>
          </div>
        </Card>
        <Card title={d.breakdown.title}>
          <dl className="flex flex-col gap-2.5 px-5 pb-5 text-sm">
            <Share label={d.breakdown.goldValue} value={r.totals.goldValue} total={itemsTotal} money={money} tone="bg-gold" />
            <Share label={d.breakdown.making} value={r.totals.making} total={itemsTotal} money={money} tone="bg-[#c9a961]" />
            <Share label={d.breakdown.stones} value={r.totals.stones} total={itemsTotal} money={money} tone="bg-[#e3d3ad]" />
            <Row label={d.breakdown.discounts} value={r.totals.discounts ? `− ${money(r.totals.discounts)}` : money(0)} />
            <Row label={d.breakdown.vat} value={money(r.totals.vat)} />
            <Row label={d.breakdown.shipping} value={money(r.totals.shipping)} />
            <div className="mt-1 flex justify-between border-t pt-3 text-base font-bold">
              <dt>{d.breakdown.total}</dt>
              <dd>{money(r.totals.sales)}</dd>
            </div>
            <p className="text-xs text-muted-foreground">{d.breakdown.note}</p>
          </dl>
        </Card>
      </div>

      {/* ===== Category · karat · best sellers ===== */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title={d.byCategory}>
          <ul className="flex flex-col gap-3 px-5 pb-5 text-sm">
            {r.byCategory.length === 0 && <li className="text-muted-foreground">{d.topProducts.empty}</li>}
            {r.byCategory.map((c) => {
              const pct = Math.round((c.sales / catTotal) * 100);
              return (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <span className="flex justify-between gap-2">
                    <span className="font-medium">{t(c.name, locale)}</span>
                    <span className="text-muted-foreground">
                      {money(c.sales)} · {num(pct)}%
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={d.byKarat.title}>
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  {[d.byKarat.karat, d.byKarat.grams, d.byKarat.pieces, d.byKarat.sales].map((h, i) => (
                    <th key={h} className={cn("py-2 font-semibold", i === 0 ? "text-start" : "text-end")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.byKarat.map((k) => (
                  <tr key={k.karat} className="border-b last:border-0">
                    <td className="py-2.5 font-semibold">{fill(d.byKarat.karatN, { k: num(k.karat) })}</td>
                    <td className="py-2.5 text-end whitespace-nowrap">
                      {num(k.grams)} {d.kpi.grams}
                    </td>
                    <td className="py-2.5 text-end">{num(k.pieces)}</td>
                    <td className="py-2.5 text-end whitespace-nowrap">{money(k.sales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title={d.topProducts.title}
          action={
            <a href={`/api/reports/export${reportQueryString(query)}&type=products`} className="text-sm font-semibold text-gold hover:underline">
              {d.exportProducts}
            </a>
          }
          className="lg:col-span-2 xl:col-span-1"
        >
          {r.topProducts.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">{d.topProducts.empty}</p>
          ) : (
            <ol className="flex flex-col px-5 pb-3">
              {r.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 border-b py-2.5 last:border-0">
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-muted-foreground">{num(i + 1)}</span>
                  <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{t(p.name, locale)}</span>
                    <span className="text-xs text-muted-foreground">{money(p.sales)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{fill(d.topProducts.pieces, { n: num(p.pieces) })}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* ===== Smaller cards ===== */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card title={d.statuses}>
          <ul className="flex flex-col gap-2 px-5 pb-5 text-sm">
            {(Object.entries(r.byStatus) as [keyof typeof dict.status, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([s, n]) => (
                <li key={s} className="flex items-center justify-between gap-2">
                  <StatusBadge status={s} label={dict.status[s]} />
                  <span className="font-semibold">{num(n)}</span>
                </li>
              ))}
          </ul>
        </Card>

        <Card title={d.payment}>
          <SplitList rows={r.byPayment.map((p) => ({ key: p.method, label: dict.orders.paymentMethod[p.method], orders: p.orders, sales: p.sales }))} total={r.totals.orders} money={money} num={num} />
        </Card>

        <Card title={d.delivery}>
          <SplitList rows={r.byDelivery.map((p) => ({ key: p.method, label: dict.orders.deliveryFilter[p.method], orders: p.orders, sales: p.sales }))} total={r.totals.orders} money={money} num={num} />
        </Card>

        <Card title={d.cities}>
          <SplitList rows={r.topCities.map((c) => ({ key: c.city, label: c.city, orders: c.orders, sales: c.sales }))} total={r.byDelivery.find((x) => x.method === "delivery")?.orders ?? 0} money={money} num={num} />
        </Card>

        <Card title={d.customers.title}>
          <div className="flex flex-col gap-3 px-5 pb-5 text-sm">
            <Row label={d.customers.new} value={num(r.customers.new)} />
            <Row label={d.customers.returning} value={num(r.customers.returning)} />
            <p className="text-xs text-muted-foreground">{d.customers.note}</p>
          </div>
        </Card>

        <Card title={d.coupons.title}>
          <ul className="flex flex-col gap-2 px-5 pb-5 text-sm">
            {r.coupons.length === 0 && <li className="text-muted-foreground">{d.coupons.none}</li>}
            {r.coupons.map((c) => (
              <li key={c.code} className="flex items-center justify-between gap-2">
                <span dir="ltr" className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-semibold">
                  {c.code}
                </span>
                <span className="text-end text-xs text-muted-foreground">
                  {fill(d.coupons.orders, { n: num(c.orders) })} · {fill(d.coupons.discount, { amount: money(c.discount) })}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={d.lost.title} className="sm:col-span-2">
          <div className="flex flex-col gap-3 px-5 pb-5 text-sm">
            <Row label={`${d.lost.cancelled} (${num(r.cancelled.orders)})`} value={money(r.cancelled.value)} />
            <Row label={`${d.lost.returned} (${num(r.returned.orders)})`} value={money(r.returned.value)} />
            <p className="text-xs text-muted-foreground">{d.lost.note}</p>
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">{fill(d.rules, { tz: storeConfig.timeZone })}</p>
    </div>
  );
}

/** A number card with "+12% vs previous period" (green up, red down) */
function Kpi({ label, value, extra, now, before, d, locale }: { label: string; value: string; extra?: string; now: number; before: number; d: Dictionary["reports"]; locale: Locale }) {
  const change = before ? ((now - before) / before) * 100 : null;
  const pct = change === null ? "" : `${change >= 0 ? "+" : "−"}${formatNumber(Math.abs(Math.round(change)), locale)}%`;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-4 sm:px-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-xl font-bold sm:text-2xl xl:text-3xl">{value}</span>
      {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
      <span className={cn("text-xs", change === null ? "text-muted-foreground" : change >= 0 ? "text-[var(--status-done-fg)]" : "text-[var(--status-cancel-fg)]")}>
        {change === null ? d.noPrevious : fill(d.vsPrevious, { pct })}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}

/** Row with a small coloured share bar (gold value / making / stones) */
function Share({ label, value, total, money, tone }: { label: string; value: number; total: number; money: (n: number) => string; tone: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-3">
        <dt className="flex items-center gap-2 text-muted-foreground">
          <span className={cn("size-2.5 rounded-full", tone)} aria-hidden />
          {label}
        </dt>
        <dd className="text-end font-medium">{money(value)}</dd>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/** Label · orders · share bar — for payment, delivery and cities */
function SplitList({ rows, total, money, num }: { rows: { key: string; label: string; orders: number; sales: number }[]; total: number; money: (n: number) => string; num: (n: number) => string }) {
  if (!rows.length) return <p className="px-5 pb-5 text-sm text-muted-foreground">—</p>;
  return (
    <ul className="flex flex-col gap-3 px-5 pb-5 text-sm">
      {rows.map((row) => {
        const pct = total ? Math.round((row.orders / total) * 100) : 0;
        return (
          <li key={row.key} className="flex flex-col gap-1">
            <span className="flex justify-between gap-2">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground">
                {num(row.orders)} · {num(pct)}%
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-gold/70" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-xs text-muted-foreground">{money(row.sales)}</span>
          </li>
        );
      })}
    </ul>
  );
}

