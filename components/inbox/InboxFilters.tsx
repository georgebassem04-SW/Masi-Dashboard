/**
 * INBOX FILTER BAR — search box + subject. Changes update the page address (/inbox?q=…&subject=…).
 * The search runs when the user presses Enter or stops typing for half a second.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { inboxQueryString, type InboxQuery } from "@/lib/inbox/query";

type Labels = { search: string; searchPlaceholder: string; subjectFilter: string; allSubjects: string; clear: string };

export function InboxFilters({ query, subjects, labels }: { query: InboxQuery; subjects: { value: string; label: string }[]; labels: Labels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(query.q ?? "");
  const first = useRef(true);

  // Changing a filter closes the open message and goes back to page 1
  const go = (changes: Partial<InboxQuery>) => router.push(`${pathname}${inboxQueryString(query, { ...changes, page: 1, m: undefined })}`);

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
      <select aria-label={labels.subjectFilter} className="h-11 rounded-lg border border-input bg-card px-3 text-sm" value={query.subject ?? ""} onChange={(e) => go({ subject: e.target.value || undefined })}>
        <option value="">{labels.allSubjects}</option>
        {subjects.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {(query.q || query.subject) && (
        <button
          type="button"
          onClick={() => {
            setText("");
            router.push(`${pathname}${inboxQueryString({ status: query.status })}`);
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
