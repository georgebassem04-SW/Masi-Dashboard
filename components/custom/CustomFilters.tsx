/**
 * CUSTOMIZATION REQUESTS FILTER BAR — search box + piece type. Changes update the page address
 * (/custom-requests?q=…&type=…). The search runs on Enter or half a second after typing stops.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { CustomListQuery } from "@/types";
import { customQueryString } from "@/lib/custom/query";

type Labels = { search: string; searchPlaceholder: string; typeFilter: string; allTypes: string; clear: string };

export function CustomFilters({ query, types, labels }: { query: CustomListQuery; types: { value: string; label: string }[]; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(query.q ?? "");
  const first = useRef(true);

  // Changing a filter closes the open request and goes back to page 1
  const go = (changes: Partial<CustomListQuery>) => router.push(`${pathname}${customQueryString(query, { ...changes, page: 1, r: undefined })}`);

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
        aria-label={labels.typeFilter}
        className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
        value={query.pieceType ?? ""}
        onChange={(e) => go({ pieceType: (e.target.value || undefined) as CustomListQuery["pieceType"] })}
      >
        <option value="">{labels.allTypes}</option>
        {types.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {(query.q || query.pieceType) && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(`${pathname}${customQueryString({ status: query.status })}`);
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
