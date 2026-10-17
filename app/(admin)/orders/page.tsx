/**
 * PAGE: /orders — ORDERS LIST (design screen 3)
 * ------------------------------------------------------------------
 *   [search · period · payment · delivery · clear · export]
 *   [status tabs with counts: الكل · جديد · مؤكد · …]
 *   [table (phones: cards)]  [pages]
 * Filters live in the address (/orders?status=pending&period=7d&q=sara) → lib/orders/query.ts
 * Data: api.listOrders() (lib/api) — orders placed on the website.
 *   - Texts   -> dictionaries → "orders", "status"
 *   - Columns -> the table below
 * Needs permission "orders" (view).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { orderQueryString, parseOrderQuery } from "@/lib/orders/query";
import { cn } from "@/lib/utils";
import { NoAccess } from "@/components/common/NoticePage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaymentBadge } from "@/components/orders/PaymentBadge";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import type { OrderStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.orders };
}

/** Tabs shown above the list (in this order) */
const TABS: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "processing", "ready_for_pickup", "shipped", "delivered", "cancelled", "returned"];

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const session = await requireStaff();
  if (!can(session, "orders")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.orders;
  const query = parseOrderQuery(await searchParams);
  const result = await api.listOrders(query, session.token);

  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <OrdersFilters
        query={query}
        labels={{
          search: d.search,
          searchPlaceholder: d.searchPlaceholder,
          period: d.period,
          paymentFilter: d.paymentFilter,
          deliveryFilter: d.deliveryFilter,
          paymentStatus: d.paymentStatus,
          export: d.export,
          clear: d.clear,
        }}
      />

      {/* ===== Status tabs ===== */}
      <nav aria-label={dict.table.status} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tab) => {
          const active = (query.status ?? "all") === tab;
          return (
            <Link
              key={tab}
              href={`/orders${orderQueryString(query, { status: tab === "all" ? undefined : tab, page: 1 })}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
                active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
              )}
            >
              {tab === "all" ? d.tabs.all : dict.status[tab]}
              <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>{formatNumber(result.counts[tab], locale)}</span>
            </Link>
          );
        })}
      </nav>

      {/* ===== List ===== */}
      <section className="overflow-hidden rounded-xl border bg-card">
        {result.items.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">{d.empty}</p>
        ) : (
          <>
            <table className="hidden w-full text-sm lg:table">
              <thead className="bg-muted text-muted-foreground">
                <tr className="border-b">
                  {[d.columns.number, d.columns.customer, d.columns.city, d.columns.date, d.columns.items, d.columns.payment, d.columns.total, d.columns.status].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((o) => (
                  <tr key={o.id} className="relative border-b last:border-0 hover:bg-[#fcfaf6]">
                    <td className="px-4 py-3">
                      {/* The link covers the whole row (after:absolute) so any click opens the order */}
                      <Link href={`/orders/${o.id}`} dir="ltr" className="font-bold after:absolute after:inset-0 hover:text-gold">
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{o.customerName}</span>
                        {o.phone && (
                          <span dir="ltr" className="self-start text-xs text-muted-foreground">
                            {o.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{o.deliveryMethod === "store_pickup" ? d.pickup : o.city}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(o.createdAt, locale)}</td>
                    <td className="px-4 py-3">{formatNumber(o.itemsCount, locale)}</td>
                    <td className="px-4 py-3">{o.paymentStatus && <PaymentBadge status={o.paymentStatus} label={d.paymentStatus[o.paymentStatus]} />}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatMoney(o.total, o.currency, locale)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} label={dict.status[o.status]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones & tablets: cards */}
            <ul className="flex flex-col lg:hidden">
              {result.items.map((o) => (
                <li key={o.id} className="border-b last:border-0">
                  <Link href={`/orders/${o.id}`} className="flex flex-col gap-1.5 px-4 py-3 active:bg-muted">
                    <span className="flex items-center justify-between gap-2">
                      <span dir="ltr" className="font-bold">
                        {o.number}
                      </span>
                      <StatusBadge status={o.status} label={dict.status[o.status]} />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {o.customerName} · {formatDateTime(o.createdAt, locale)}
                      </span>
                      <span className="font-bold whitespace-nowrap">{formatMoney(o.total, o.currency, locale)}</span>
                    </span>
                    {o.paymentStatus && (
                      <span>
                        <PaymentBadge status={o.paymentStatus} label={d.paymentStatus[o.paymentStatus]} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ===== Pages ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{fill(d.showing, { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(result.total, locale) })}</span>
        {pages > 1 && (
          <div className="flex gap-2">
            <PageLink disabled={result.page <= 1} href={`/orders${orderQueryString(query, { page: result.page - 1 })}`} label={d.prev} />
            <span className="flex h-10 items-center px-2 font-semibold text-foreground">
              {formatNumber(result.page, locale)} / {formatNumber(pages, locale)}
            </span>
            <PageLink disabled={result.page >= pages} href={`/orders${orderQueryString(query, { page: result.page + 1 })}`} label={d.next} />
          </div>
        )}
      </div>
    </div>
  );
}

function PageLink({ href, label, disabled }: { href: string; label: string; disabled: boolean }) {
  return disabled ? (
    <span className="flex h-10 items-center rounded-lg border border-input px-4 opacity-40">{label}</span>
  ) : (
    <Link href={href} className="flex h-10 items-center rounded-lg border border-input bg-card px-4 font-semibold text-foreground hover:bg-muted">
      {label}
    </Link>
  );
}
