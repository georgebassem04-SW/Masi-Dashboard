/**
 * PRODUCT FILTER OPTIONS — the form of the sidebar page "Product filter" (/filters).
 * ------------------------------------------------------------------
 * Controls the filter column of the website's product pages (/products and every category page):
 *   1) Sections   -> switch each one on / off and move it up / down
 *                    (category · special offers · price · karat · metal · weight · collection · in stock)
 *   2) Categories -> all main categories, or only the ones you add (in the order you put them)
 * Saved in theme.filters (same Save draft → Publish as the rest of the theme).
 *   - Defaults and checks: lib/theme-chrome.ts → DEFAULT_FILTERS / parseFilters
 *   - Texts: dictionaries → "theme.filters"
 *   - How the website uses it: storefront/components/catalog/FilterPanel.tsx + ProductListing.tsx
 */
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { FilterSection, SiteTheme, ThemeFilters } from "@/types";
import { FILTER_SECTIONS, MAX_FILTER_CATEGORIES } from "@/lib/theme-chrome";
import { iconFor } from "@/lib/icon-library";
import { cn } from "@/lib/utils";
import { Choice, Toggle } from "./fields";
import { Group, IconPicker } from "./chrome-fields";

/** A category the filter can list */
export interface FilterCategory {
  id: string;
  name: string;
  /** Sub-category (shown a little indented in the "add" list) */
  isChild: boolean;
  /** false = hidden from the website, so it won't appear in the filter either */
  visible: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = any;

export function FiltersPanel({ theme, setTheme, categories, labels: L, disabled }: { theme: SiteTheme; setTheme: (next: (t: SiteTheme) => SiteTheme) => void; categories: FilterCategory[]; labels: Labels; disabled?: boolean }) {
  const F = L.filters;
  const f = theme.filters;
  const set = (patch: Partial<ThemeFilters>) => setTheme((t) => ({ ...t, filters: { ...t.filters, ...patch } }));
  // "Chosen categories" stays selected while the list is still empty
  const [custom, setCustom] = useState(f.categoryIds.length > 0);

  /* ---------- 1) sections ---------- */
  const hidden = FILTER_SECTIONS.filter((s) => !f.sections.includes(s));
  const moveSection = (i: number, by: number) => {
    const next = [...f.sections];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    set({ sections: next });
  };
  const toggleSection = (s: FilterSection, on: boolean) => set({ sections: on ? [...f.sections, s] : f.sections.filter((x) => x !== s) });

  /* ---------- 2) categories ---------- */
  const byId = new Map(categories.map((c) => [c.id, c]));
  const chosen = f.categoryIds.filter((id) => byId.has(id));
  const rest = categories.filter((c) => !chosen.includes(c.id));
  const moveCategory = (i: number, by: number) => {
    const next = [...chosen];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    set({ categoryIds: next });
  };
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  // What the website shows in the "Category" section right now
  const listed = custom && chosen.length ? chosen.map((id) => byId.get(id)!) : categories.filter((c) => !c.isChild);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* ===== Where & how it shows (computers; phones always get a "Filter" button) ===== */}
        <Group title={F.place.title} hint={F.place.hint}>
          <Choice label={F.place.display} value={f.display} disabled={disabled} options={(["sidebar", "drawer"] as const).map((v) => ({ value: v, label: F.place.displays[v] }))} onChange={(v) => set({ display: v })} />
          <Choice label={f.display === "sidebar" ? F.place.sideColumn : F.place.sidePanel} value={f.side} disabled={disabled} options={(["start", "end"] as const).map((v) => ({ value: v, label: F.place.sides[v] }))} onChange={(v) => set({ side: v })} />
          {f.display === "drawer" && (
            <>
              <Choice label={F.place.buttonLook} value={f.buttonLook} disabled={disabled} options={(["icon", "text", "both"] as const).map((v) => ({ value: v, label: F.place.looks[v] }))} onChange={(v) => set({ buttonLook: v })} />
              <Choice label={F.place.buttonPosition} value={f.buttonPosition} disabled={disabled} options={(["start", "end"] as const).map((v) => ({ value: v, label: F.place.sides[v] }))} onChange={(v) => set({ buttonPosition: v })} />
            </>
          )}
          {/* Drawing of the "Filter" button (phones always show it; computers when "A button that opens a panel") */}
          <IconPicker label={F.place.icon} slot="filter" value={f.icon} disabled={disabled} onChange={(icon) => set({ icon })} />
          <Toggle label={F.place.showCount} checked={f.showCount} disabled={disabled} onChange={(v) => set({ showCount: v })} />
          <Toggle label={F.place.viewSwitch} checked={f.viewSwitch} disabled={disabled} onChange={(v) => set({ viewSwitch: v })} />
          {/* A tiny drawing of the bar above the products */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs" dir="ltr">
            {(() => {
              const FilterIcon = iconFor("filter", f.icon)!;
              const btn =
                f.display === "drawer" ? (
                  <span className="inline-flex items-center gap-1 rounded border bg-card px-2 py-1">
                    {f.buttonLook !== "text" && <FilterIcon className="size-3.5" />}
                    {f.buttonLook !== "icon" && F.place.word}
                  </span>
                ) : null;
              const sort = <span className="rounded border bg-card px-2 py-1">{F.place.sort}</span>;
              const count = (
                <span className="flex items-center gap-2 text-muted-foreground">
                  {f.viewSwitch && <span className="text-foreground">▥ ☰</span>}
                  {f.showCount && F.place.count}
                </span>
              );
              return f.display === "drawer" && f.buttonPosition === "start" ? (
                <>
                  {btn}
                  <span className="flex items-center gap-2">
                    {sort}
                    {count}
                  </span>
                </>
              ) : (
                <>
                  {count ?? <span />}
                  <span className="flex items-center gap-2">
                    {btn}
                    {sort}
                  </span>
                </>
              );
            })()}
          </div>
        </Group>

        <Group title={F.sectionsTitle} hint={F.sectionsHint}>
          <ul className="flex flex-col gap-2">
            {f.sections.map((s, i) => (
              <li key={s} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0 flex-1">
                  <Toggle label={F.sectionNames[s]} checked disabled={disabled} onChange={() => toggleSection(s, false)} />
                  {F.sectionHints[s] && <p className="mt-1 text-xs text-muted-foreground">{F.sectionHints[s]}</p>}
                </div>
                <button type="button" disabled={disabled || i === 0} onClick={() => moveSection(i, -1)} aria-label={`${F.up}: ${F.sectionNames[s]}`} className={iconButton}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" disabled={disabled || i === f.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label={`${F.down}: ${F.sectionNames[s]}`} className={iconButton}>
                  <ArrowDown className="size-4" />
                </button>
              </li>
            ))}
            {/* Switched off: kept at the bottom so they can be switched back on */}
            {hidden.map((s) => (
              <li key={s} className="rounded-lg border border-dashed px-3 py-2 opacity-70">
                <Toggle label={F.sectionNames[s]} checked={false} disabled={disabled} onChange={() => toggleSection(s, true)} />
              </li>
            ))}
          </ul>
        </Group>

        <Group title={F.categoriesTitle} hint={F.categoriesHint}>
          <Choice
            label={F.categoriesMode}
            value={custom ? "chosen" : "all"}
            disabled={disabled}
            onChange={(v) => {
              setCustom(v === "chosen");
              if (v === "all") set({ categoryIds: [] });
            }}
            options={[
              { value: "all", label: F.modes.all },
              { value: "chosen", label: F.modes.chosen },
            ]}
          />

          {custom && (
            <>
              {chosen.length === 0 && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{F.noneChosen}</p>}
              <ul className="flex flex-col gap-2">
                {chosen.map((id, i) => {
                  const c = byId.get(id)!;
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {c.name}
                        {!c.visible && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{F.hiddenCategory}</span>}
                      </span>
                      <button type="button" disabled={disabled || i === 0} onClick={() => moveCategory(i, -1)} aria-label={`${F.up}: ${c.name}`} className={iconButton}>
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" disabled={disabled || i === chosen.length - 1} onClick={() => moveCategory(i, 1)} aria-label={`${F.down}: ${c.name}`} className={iconButton}>
                        <ArrowDown className="size-4" />
                      </button>
                      <button type="button" disabled={disabled} onClick={() => set({ categoryIds: chosen.filter((x) => x !== id) })} aria-label={`${F.remove}: ${c.name}`} className={cn(iconButton, "text-destructive")}>
                        <X className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Categories that can still be added */}
              {rest.length > 0 && chosen.length < MAX_FILTER_CATEGORIES && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">{F.add}</span>
                  <div className="flex flex-wrap gap-2">
                    {rest.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => set({ categoryIds: [...chosen, c.id] })}
                        className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-gold px-3 text-sm hover:bg-accent disabled:opacity-60", c.isChild && "text-muted-foreground", !c.visible && "opacity-60")}
                      >
                        <Plus className="size-3.5 text-gold" />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Group>
      </div>

      {/* ===== Sketch of the filter column as the customer sees it ===== */}
      <aside className="rounded-xl border bg-card p-4 xl:sticky xl:top-32">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">{F.preview}</p>
        {f.sections.length === 0 && <p className="text-sm text-muted-foreground">{F.empty}</p>}
        <div className="flex flex-col divide-y text-sm">
          {f.sections.map((s) => (
            <div key={s} className="py-3 first:pt-0 last:pb-0">
              <p className="mb-2 font-semibold">{F.sectionNames[s]}</p>
              {s === "category" && (
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {listed.slice(0, 8).map((c) => (
                    <li key={c.id} className="truncate">
                      {c.name}
                    </li>
                  ))}
                  {listed.length > 8 && <li>…</li>}
                </ul>
              )}
              {(s === "price" || s === "weight") && (
                <div className="flex items-center gap-2">
                  <span className="h-7 flex-1 rounded border" />
                  <span>–</span>
                  <span className="h-7 flex-1 rounded border" />
                </div>
              )}
              {(s === "karat" || s === "collection") && (
                <div className="flex gap-1.5">
                  {(s === "karat" ? ["21K", "18K"] : ["…", "…"]).map((x, i) => (
                    <span key={i} className="rounded-full border px-2.5 py-0.5 text-xs">
                      {x}
                    </span>
                  ))}
                </div>
              )}
              {(s === "offers" || s === "stock" || s === "metal") && <span className="inline-block size-4 rounded border align-middle" />}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
