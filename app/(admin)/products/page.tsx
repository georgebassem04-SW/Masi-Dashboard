/**
 * PAGE: /products — PRODUCTS LIST (design screen 5)
 * ------------------------------------------------------------------
 *   [Sync with ERP] [+ Add product]
 *   [search · category · karat · stock · sort]
 *   [tabs: all · on the website · hidden · out of stock]
 *   [table: product · SKU · category · karat · weight · today's price · stock · on website (switch) · edit]
 * Weight, stock and SKU come from the ERP (read-only). The price is "from" today's gold price (lib/catalog/pricing.ts).
 * Filters live in the address → lib/catalog/query.ts. Data: api.listProducts() + api.listCategories().
 *   - Texts: dictionaries → "products"
 * Needs permission "products" (view to see, edit to change).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatMoney, formatNumber, t } from "@/lib/format";
import { parseProductQuery, productQueryString } from "@/lib/catalog/query";
import { cn } from "@/lib/utils";
import type { ProductListQuery } from "@/types";
import { NoAccess } from "@/components/common/NoticePage";
import { ProductsFilters } from "@/components/catalog/ProductsFilters";
import { StockBadge } from "@/components/catalog/StockBadge";
import { SyncButton } from "@/components/catalog/SyncButton";
import { VisibilitySwitch } from "@/components/catalog/VisibilitySwitch";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.products };
}

/** Tabs above the table → which filter each one sets */
const TABS: { key: "all" | "visible" | "hidden" | "out_of_stock"; changes: Partial<ProductListQuery> }[] = [
  { key: "all", changes: { visibility: undefined, stock: undefined } },
  { key: "visible", changes: { visibility: "visible", stock: undefined } },
  { key: "hidden", changes: { visibility: "hidden", stock: undefined } },
  { key: "out_of_stock", changes: { visibility: undefined, stock: "out_of_stock" } },
];

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const session = await requireStaff();
  if (!can(session, "products")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.products;
  const query = parseProductQuery(await searchParams);
  const [result, categories] = await Promise.all([api.listProducts(query, session.token), api.listCategories(session.token)]);
  const canEdit = can(session, "products", "edit");
  const catName = new Map(categories.map((c) => [c.id, t(c.name, locale)]));

  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const money = (n: number) => formatMoney(n, result.currency, locale);
  const grams = (a: number, b: number) => (a === b ? formatNumber(a, locale) : `${formatNumber(a, locale)}–${formatNumber(b, locale)}`);
  const activeTab = query.stock === "out_of_stock" ? "out_of_stock" : (query.visibility ?? "all");

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      {/* ===== Top ===== */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>{d.erpNote}</span>
          <span className="text-xs">{result.lastSyncAt ? fill(d.lastSync, { when: formatDateTime(result.lastSyncAt, locale) }) : d.neverSynced}</span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-start gap-2">
            <SyncButton labels={{ sync: d.sync, syncing: d.syncing, synced: d.synced, failed: d.errors.failed }} />
            <Link href="/products/new" className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90">
              <Plus className="size-4" />
              {d.add}
            </Link>
          </div>
        )}
      </div>

      <ProductsFilters
        query={query}
        categories={categories.map((c) => ({ id: c.id, name: t(c.name, locale) }))}
        labels={{ search: d.search, searchPlaceholder: d.searchPlaceholder, allCategories: d.allCategories, allKarats: d.allKarats, karatN: d.karatN, allStock: d.allStock, stock: d.stock, sort: d.sort, clear: d.clear }}
      />

      <nav aria-label={d.columns.visible} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/products${productQueryString(query, { ...tab.changes, page: 1 })}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
                active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
              )}
            >
              {d.tabs[tab.key]}
              <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>{formatNumber(result.counts[tab.key], locale)}</span>
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
                  {[d.columns.product, d.columns.sku, d.columns.category, d.columns.karat, d.columns.weight, d.columns.price, d.columns.stock, d.columns.visible].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((p) => (
                  <tr key={p.id} className={cn("relative border-b last:border-0 hover:bg-[#fcfaf6]", !p.visible && "text-muted-foreground")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb url={p.imageUrl} dim={!p.visible} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          {/* The link covers the whole row; the switch sits above it (z-10) */}
                          <Link href={`/products/${encodeURIComponent(p.id)}`} className="font-semibold text-foreground after:absolute after:inset-0 hover:text-gold">
                            {t(p.name, locale)}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {fill(d.sizes, { n: formatNumber(p.variantsCount, locale) })}
                            {p.source === "manual" && ` · ${d.manualBadge}`}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3">{catName.get(p.categoryId) ?? "—"}</td>
                    <td className="px-4 py-3">{formatNumber(p.karat, locale)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {grams(p.minWeight, p.maxWeight)} {d.grams}
                    </td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap text-foreground">{money(p.price)}</td>
                    <td className="px-4 py-3">
                      <StockBadge stock={p.stock} label={d.stock[p.stock]} extra={p.stock === "made_to_order" ? undefined : formatNumber(p.stockQty, locale)} />
                    </td>
                    <td className="px-4 py-3">
                      <VisibilitySwitch id={p.id} visible={p.visible} label={`${d.columns.visible}: ${t(p.name, locale)}`} disabled={!canEdit} labels={{ failed: d.toggleFailed }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones & tablets: cards */}
            <ul className="flex flex-col lg:hidden">
              {result.items.map((p) => (
                <li key={p.id} className="relative flex items-center gap-3 border-b px-4 py-3 last:border-0">
                  <Thumb url={p.imageUrl} dim={!p.visible} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/products/${encodeURIComponent(p.id)}`} className="truncate font-semibold after:absolute after:inset-0">
                      {t(p.name, locale)}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      <span dir="ltr">{p.sku}</span> · {fill(d.karatN, { k: formatNumber(p.karat, locale) })} · {grams(p.minWeight, p.maxWeight)} {d.grams}
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">{money(p.price)}</span>
                      <StockBadge stock={p.stock} label={d.stock[p.stock]} extra={p.stock === "made_to_order" ? undefined : formatNumber(p.stockQty, locale)} />
                    </span>
                  </div>
                  <VisibilitySwitch id={p.id} visible={p.visible} label={`${d.columns.visible}: ${t(p.name, locale)}`} disabled={!canEdit} labels={{ failed: d.toggleFailed }} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{fill(d.showing, { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(result.total, locale) })}</span>
        {pages > 1 && (
          <div className="flex gap-2">
            <PageLink disabled={result.page <= 1} href={`/products${productQueryString(query, { page: result.page - 1 })}`} label={d.prev} />
            <span className="flex h-10 items-center px-2 font-semibold text-foreground">
              {formatNumber(result.page, locale)} / {formatNumber(pages, locale)}
            </span>
            <PageLink disabled={result.page >= pages} href={`/products${productQueryString(query, { page: result.page + 1 })}`} label={d.next} />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{d.priceNote}</p>
    </div>
  );
}

function Thumb({ url, dim }: { url?: string; dim?: boolean }) {
  return (
    <span className={cn("size-12 shrink-0 overflow-hidden rounded-lg bg-muted", dim && "opacity-50")}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      )}
    </span>
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
