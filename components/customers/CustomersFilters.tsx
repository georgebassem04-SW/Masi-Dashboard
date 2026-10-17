/**
 * CUSTOMERS FILTER BAR — search box, sort, "accept offers only", clear and export.
 * Every change updates the page address (/customers?q=…&sort=…), and the server page reloads the list.
 * The search runs when the user presses Enter or stops typing for half a second.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import type { CustomerListQuery, CustomerSort } from "@/types";
import { customerQueryString, SORTS } from "@/lib/customers/query";

type Labels = {
  search: string;
  searchPlaceholder: string;
  sort: Record<string, string>;
  marketingOnly: string;
  export: string;
  clear: string;
};

export function CustomersFilters({ query, labels }: { query: CustomerListQuery; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(query.q ?? "");
  const first = useRef(true);

  const go = (changes: Partial<CustomerListQuery>) => router.push(`${pathname}${customerQueryString(query, { ...changes, page: 1 })}`);

  // Keep the box in sync when the address changes from outside (e.g. "customer file" link from an order)
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

  const hasFilters = !!(query.q || query.sort || query.marketing);

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
      <select
        aria-label={labels.sort.label}
        className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
        value={query.sort ?? "newest"}
        onChange={(e) => go({ sort: e.target.value === "newest" ? undefined : (e.target.value as CustomerSort) })}
      >
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {labels.sort[s]}
          </option>
        ))}
      </select>
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--gold)]" checked={!!query.marketing} onChange={(e) => go({ marketing: e.target.checked || undefined })} />
        {labels.marketingOnly}
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(`${pathname}${customerQueryString({ segment: query.segment })}`);
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
          {labels.clear}
        </button>
      )}
      <a
        href={`/api/customers/export${customerQueryString(query, { page: 1 })}`}
        className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted"
      >
        <Download className="size-4" />
        {labels.export}
      </a>
    </div>
  );
}
