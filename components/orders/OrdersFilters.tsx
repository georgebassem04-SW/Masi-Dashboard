/**
 * ORDERS FILTER BAR — search box, period, payment and delivery filters, "clear" and "export".
 * Every change updates the page address (/orders?q=…&period=…), and the server page reloads the list.
 * The search runs when the user presses Enter or stops typing for half a second.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import type { OrderListQuery } from "@/types";
import { orderQueryString, PAYMENT_STATUSES, PERIODS } from "@/lib/orders/query";

type Labels = {
  search: string;
  searchPlaceholder: string;
  period: Record<string, string>;
  paymentFilter: { label: string; all: string };
  deliveryFilter: Record<string, string>;
  paymentStatus: Record<string, string>;
  export: string;
  clear: string;
};

const select = "h-11 rounded-lg border border-input bg-card px-3 text-sm";

export function OrdersFilters({ query, labels }: { query: OrderListQuery; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(query.q ?? "");
  const first = useRef(true);

  const go = (changes: Partial<OrderListQuery>) => router.push(`${pathname}${orderQueryString(query, { ...changes, page: 1 })}`);

  // Keep the box in sync when the address changes from outside (e.g. the top-bar search)
  useEffect(() => {
    setText(query.q ?? "");
  }, [query.q]);

  // Search while typing (after a short pause)
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((query.q ?? "") !== text.trim()) go({ q: text.trim() || undefined });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const hasFilters = !!(query.q || query.period || query.payment || query.delivery);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: text.trim() || undefined });
        }}
        className="relative min-w-60 flex-1"
      >
        <Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.search}
          className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </form>
      <select aria-label={labels.period.label} className={select} value={query.period ?? "all"} onChange={(e) => go({ period: e.target.value === "all" ? undefined : (e.target.value as OrderListQuery["period"]) })}>
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {labels.period[p]}
          </option>
        ))}
      </select>
      <select aria-label={labels.paymentFilter.label} className={select} value={query.payment ?? ""} onChange={(e) => go({ payment: (e.target.value || undefined) as OrderListQuery["payment"] })}>
        <option value="">{labels.paymentFilter.all}</option>
        {PAYMENT_STATUSES.map((p) => (
          <option key={p} value={p}>
            {labels.paymentStatus[p]}
          </option>
        ))}
      </select>
      <select aria-label={labels.deliveryFilter.label} className={select} value={query.delivery ?? ""} onChange={(e) => go({ delivery: (e.target.value || undefined) as OrderListQuery["delivery"] })}>
        <option value="">{labels.deliveryFilter.all}</option>
        <option value="delivery">{labels.deliveryFilter.delivery}</option>
        <option value="store_pickup">{labels.deliveryFilter.store_pickup}</option>
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(`${pathname}${orderQueryString({ status: query.status })}`);
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
          {labels.clear}
        </button>
      )}
      <a
        href={`/api/orders/export${orderQueryString(query, { page: 1 })}`}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted"
      >
        <Download className="size-4" />
        {labels.export}
      </a>
    </div>
  );
}
