/**
 * WEBSITE TEXTS EDITOR — every fixed text of the storefront (menu, buttons, labels, messages).
 * Lists the ORIGINAL text (from config/storefront-texts/*.json, a copy of storefront/i18n/dictionaries)
 * with a box to replace it. Only replaced texts are saved (theme.texts.ar / theme.texts.en).
 * Filter by section, search, or show only changed texts.
 */
"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";
import { fill } from "@/lib/format";
import arTexts from "@/config/storefront-texts/ar.json";
import enTexts from "@/config/storefront-texts/en.json";

type Flat = { key: string; section: string; value: string }[];

function flatten(o: Record<string, unknown>, prefix = ""): Flat {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [{ key: `${prefix}${k}`, section: (prefix + k).split(".")[0], value: String(v) }],
  );
}

const DEFAULTS: Record<Locale, Flat> = { ar: flatten(arTexts), en: flatten(enTexts) };
const SECTIONS = Array.from(new Set(DEFAULTS.ar.map((r) => r.section)));

export type TextsLabels = {
  intro: string;
  language: string;
  group: string;
  all: string;
  search: string;
  changed: string;
  onlyChanged: string;
  reset: string;
  empty: string;
  keepPlaceholders: string;
};

export function TextsEditor({
  value,
  onChange,
  labels,
  disabled,
}: {
  value: { ar: Record<string, string>; en: Record<string, string> };
  onChange: (v: { ar: Record<string, string>; en: Record<string, string> }) => void;
  labels: TextsLabels;
  disabled?: boolean;
}) {
  const [lang, setLang] = useState<Locale>("ar");
  const [section, setSection] = useState("");
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);

  const overrides = value[lang];
  const changedCount = Object.keys(value.ar).length + Object.keys(value.en).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEFAULTS[lang].filter(
      (r) =>
        (!section || r.section === section) &&
        (!onlyChanged || r.key in overrides) &&
        (!q || r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q) || (overrides[r.key] ?? "").toLowerCase().includes(q)),
    );
  }, [lang, section, query, onlyChanged, overrides]);

  function set(key: string, text: string, original: string) {
    const next = { ...overrides };
    // Empty or same as the original = no override
    if (!text.trim() || text === original) delete next[key];
    else next[key] = text;
    onChange({ ...value, [lang]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{labels.intro}</p>
      <p className="rounded-lg bg-accent px-3 py-2 text-xs">{labels.keepPlaceholders}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div role="radiogroup" aria-label={labels.language} className="flex rounded-lg bg-muted p-1">
          {(["ar", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={lang === l}
              onClick={() => setLang(l)}
              className={cn("h-9 rounded-md px-4 text-sm font-semibold", lang === l ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
        <select aria-label={labels.group} value={section} onChange={(e) => setSection(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3 text-sm">
          <option value="">{labels.all}</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
          className="h-11 min-w-40 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
        />
        <label className="flex h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="size-4 accent-[var(--gold)]" />
          {labels.onlyChanged}
        </label>
      </div>
      <span className="text-sm font-semibold text-gold">{fill(labels.changed, { count: changedCount })}</span>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {rows.map((r) => {
            const changed = r.key in overrides;
            return (
              <li key={r.key} className={cn("flex flex-col gap-1.5 px-4 py-3", changed && "bg-[#fcf8ef]")}>
                <div className="flex items-center justify-between gap-2">
                  <code dir="ltr" className="text-xs text-muted-foreground">
                    {r.key}
                  </code>
                  {changed && (
                    <button type="button" disabled={disabled} onClick={() => set(r.key, "", r.value)} className="text-xs font-semibold text-gold hover:underline">
                      {labels.reset}
                    </button>
                  )}
                </div>
                <input
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  aria-label={r.key}
                  value={overrides[r.key] ?? ""}
                  placeholder={r.value}
                  disabled={disabled}
                  maxLength={600}
                  onChange={(e) => set(r.key, e.target.value, r.value)}
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm placeholder:text-[#8a8174]"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
