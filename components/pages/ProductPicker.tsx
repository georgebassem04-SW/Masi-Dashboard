/**
 * PRODUCT PICKER — "Product row" block with "I'll choose them": search by name or code, add, reorder, remove.
 * The website shows the products in this order. The list comes from Products (ctx.products).
 */
"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { EditorCtx } from "./fields";

const MAX = 24;

export function ProductPicker({ ctx, value, onChange, invalid }: { ctx: EditorCtx; value: string[]; onChange: (ids: string[]) => void; invalid?: boolean }) {
  const F = ctx.labels.fields;
  const [q, setQ] = useState("");
  const all = ctx.products ?? [];
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const results = q.trim() ? all.filter((p) => !value.includes(p.id) && matchesSearch(q, [p.name, p.sku])).slice(0, 8) : [];
  const move = (i: number, by: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className={cn("text-sm font-semibold", invalid && !value.length && "text-destructive")}>{F.pickProducts}</span>
      {value.length === 0 ? (
        <p className={cn("rounded-lg border border-dashed px-3 py-4 text-center text-sm", invalid ? "border-destructive text-destructive" : "text-muted-foreground")}>{F.noPicked}</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {value.map((id, i) => {
            const p = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <Thumb url={p?.imageUrl} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{p?.name ?? id}</span>
                  <span className="truncate text-xs text-muted-foreground" dir="ltr">
                    {p?.sku}
                    {p && !p.visible && <span className="ms-2 text-destructive">· {F.hiddenProduct}</span>}
                  </span>
                </span>
                {!ctx.disabled && (
                  <span className="flex shrink-0">
                    <button type="button" aria-label={`${p?.name ?? id} ↑`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 hover:bg-card disabled:opacity-30">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" aria-label={`${p?.name ?? id} ↓`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 hover:bg-card disabled:opacity-30">
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" aria-label={`${F.removeItem}: ${p?.name ?? id}`} onClick={() => onChange(value.filter((x) => x !== id))} className="rounded-md p-1.5 text-destructive hover:bg-[#f6e0dc]">
                      <X className="size-4" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!ctx.disabled && value.length < MAX && (
        <div className="flex flex-col gap-1">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={F.searchProducts}
            aria-label={F.searchProducts}
            className="h-11 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {q.trim() && (
            <ul className="flex flex-col gap-1 rounded-lg border p-1">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">{F.noResults}</li>
              ) : (
                results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange([...value, p.id]);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start hover:bg-muted"
                    >
                      <Thumb url={p.imageUrl} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {p.sku}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-gold">
                        <Plus className="size-4" />
                        {F.addProduct}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Thumb({ url }: { url?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="" className="size-10 shrink-0 rounded-md bg-muted object-cover" /> : <span className="size-10 shrink-0 rounded-md bg-muted" />;
}
