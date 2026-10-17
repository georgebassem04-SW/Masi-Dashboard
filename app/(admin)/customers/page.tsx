/**
 * PAGE: /customers — CUSTOMERS LIST (design screen 11)
 * ------------------------------------------------------------------
 *   [search · sort · accept offers only · clear · export]
 *   [tabs with counts: الكل · لديهم حساب · طلبوا كزوار · عملاء متكررون · موقوفون]
 *   [table (phones: cards)]  [pages]
 * Includes people who ordered without an account ("guests"), grouped by phone number.
 * Filters live in the address (/customers?segment=repeat&sort=spent&q=reem) → lib/customers/query.ts
 * Data: api.listCustomers() (lib/api) — accounts and guests from the website.
 *   - Texts   -> dictionaries → "customers"
 *   - Columns -> the table below
 * Needs permission "customers" (view).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { customerQueryString, parseCustomerQuery, SEGMENTS } from "@/lib/customers/query";
import { cn } from "@/lib/utils";
import { NoAccess } from "@/components/common/NoticePage";
import { CustomersFilters } from "@/components/customers/CustomersFilters";
import { CustomerAvatar, KindBadge } from "@/components/customers/CustomerBits";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.customers };
}

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const session = await requireStaff();
  if (!can(session, "customers")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.customers;
  const query = parseCustomerQuery(await searchParams);
  const result = await api.listCustomers(query, session.token);

  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const money = (n: number, currency: string) => formatMoney(n, currency, locale);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <CustomersFilters
        query={query}
        labels={{ search: d.search, searchPlaceholder: d.searchPlaceholder, sort: d.sort, marketingOnly: d.marketingOnly, export: d.export, clear: d.clear }}
      />

      {/* ===== Tabs ===== */}
      <nav aria-label={d.columns.type} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SEGMENTS.map((tab) => {
          const active = (query.segment ?? "all") === tab;
          return (
            <Link
              key={tab}
              href={`/customers${customerQueryString(query, { segment: tab === "all" ? undefined : tab, page: 1 })}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
                active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
              )}
            >
              {d.tabs[tab]}
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
                  {[d.columns.name, d.columns.city, d.columns.type, d.columns.orders, d.columns.spent, d.columns.lastOrder, d.columns.since].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((c) => (
                  <tr key={c.id} className="relative border-b last:border-0 hover:bg-[#fcfaf6]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar name={c.name} />
                        <div className="flex min-w-0 flex-col">
                          {/* The link covers the whole row (after:absolute) so any click opens the customer */}
                          <Link href={`/customers/${encodeURIComponent(c.id)}`} className="font-semibold after:absolute after:inset-0 hover:text-gold">
                            {c.name}
                          </Link>
                          <span dir="ltr" className="self-start text-xs text-muted-foreground">
                            {c.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <KindBadge customer={c} labels={d} />
                    </td>
                    <td className="px-4 py-3">{formatNumber(c.ordersCount, locale)}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{money(c.totalSpent, c.currency)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{c.lastOrderAt ? formatDateTime(c.lastOrderAt, locale) : d.never}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(c.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones & tablets: cards */}
            <ul className="flex flex-col lg:hidden">
              {result.items.map((c) => (
                <li key={c.id} className="border-b last:border-0">
                  <Link href={`/customers/${encodeURIComponent(c.id)}`} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
                    <CustomerAvatar name={c.name} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{c.name}</span>
                        <span className="font-bold whitespace-nowrap">{money(c.totalSpent, c.currency)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {formatNumber(c.ordersCount, locale)} {d.columns.orders}
                          {c.city && ` · ${c.city}`}
                        </span>
                        <KindBadge customer={c} labels={d} />
                      </span>
                    </span>
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
            <PageLink disabled={result.page <= 1} href={`/customers${customerQueryString(query, { page: result.page - 1 })}`} label={d.prev} />
            <span className="flex h-10 items-center px-2 font-semibold text-foreground">
              {formatNumber(result.page, locale)} / {formatNumber(pages, locale)}
            </span>
            <PageLink disabled={result.page >= pages} href={`/customers${customerQueryString(query, { page: result.page + 1 })}`} label={d.next} />
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
