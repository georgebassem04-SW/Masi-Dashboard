/**
 * PRODUCTS FILTER BAR — search, category, karat, stock, sort, clear.
 * Every change updates the page address (/products?…), the server page reloads the list.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Karat, ProductListQuery } from "@/types";
import { KARATS, PRODUCT_SORTS, productQueryString, STOCK_FILTERS } from "@/lib/catalog/query";
import { fill } from "@/lib/format";

type Labels = {
  search: string;
  searchPlaceholder: string;
  allCategories: string;
  allKarats: string;
  karatN: string;
  allStock: string;
  stock: Record<string, string>;
  sort: Record<string, string>;
  clear: string;
};

const select = "h-11 rounded-lg border border-input bg-card px-3 text-sm";

export function ProductsFilters({ query, categories, labels }: { query: ProductListQuery; categories: { id: string; name: string }[]; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(query.q ?? "");
  const first = useRef(true);
  const go = (changes: Partial<ProductListQuery>) => router.push(`${pathname}${productQueryString(query, { ...changes, page: 1 })}`);

  useEffect(() => {
    setText(query.q ?? "");
  }, [query.q]);

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

  const hasFilters = !!(query.q || query.categoryId || query.karat || query.stock || query.sort);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: text.trim() || undefined });
        }}
        className="relative min-w-56 flex-1"
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
      <select aria-label={labels.allCategories} className={select} value={query.categoryId ?? ""} onChange={(e) => go({ categoryId: e.target.value || undefined })}>
        <option value="">{labels.allCategories}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select aria-label={labels.allKarats} className={select} value={query.karat ?? ""} onChange={(e) => go({ karat: (Number(e.target.value) || undefined) as Karat | undefined })}>
        <option value="">{labels.allKarats}</option>
        {KARATS.map((k) => (
          <option key={k} value={k}>
            {fill(labels.karatN, { k })}
          </option>
        ))}
      </select>
      <select aria-label={labels.allStock} className={select} value={query.stock ?? ""} onChange={(e) => go({ stock: (e.target.value || undefined) as ProductListQuery["stock"] })}>
        <option value="">{labels.allStock}</option>
        {STOCK_FILTERS.map((s) => (
          <option key={s} value={s}>
            {labels.stock[s]}
          </option>
        ))}
      </select>
      <select aria-label={labels.sort.label} className={select} value={query.sort ?? "newest"} onChange={(e) => go({ sort: e.target.value === "newest" ? undefined : (e.target.value as ProductListQuery["sort"]) })}>
        {PRODUCT_SORTS.map((s) => (
          <option key={s} value={s}>
            {labels.sort[s]}
          </option>
        ))}
      </select>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(`${pathname}${productQueryString({ visibility: query.visibility })}`);
          }}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
          {labels.clear}
        </button>
      )}
    </div>
  );
}
