/**
 * FORM PIECES shared by the Header and Footer editors (HeaderPanel.tsx / FooterPanel.tsx):
 *   Group          -> a titled box that holds related settings
 *   OptionalColor  -> a colour that can be left on "automatic" (saved as "")
 *   BiText         -> one text in Arabic + English
 *   LinksEditor    -> list of extra links (text in both languages + address), add / remove / reorder
 *   IconPicker     -> choose one icon for a slot from the icon library (lib/icon-library.ts)
 */
"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ChromeLink, LocalizedText } from "@/types";
import { MAX_EXTRA_LINKS } from "@/lib/theme-chrome";
import { ICON_LIBRARY, type IconSlot } from "@/lib/icon-library";
import { cn } from "@/lib/utils";
import { ColorField, Field, TextInput, Toggle } from "./fields";

export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <legend className="float-start mb-1 w-full font-heading text-base font-bold">{title}</legend>
      {hint && <p className="-mt-3 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

/** Switch "choose my own colour"; off = automatic (the value is saved as "") */
export function OptionalColor({
  label,
  autoLabel,
  value,
  fallback,
  against,
  onChange,
  labels,
  disabled,
}: {
  label: string;
  /** Text of the switch, e.g. "Choose a colour" */
  autoLabel: string;
  value: string;
  /** Colour to start from when the switch is turned on */
  fallback: string;
  against?: string;
  onChange: (v: string) => void;
  labels: { contrastLow: string; contrastOk: string };
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Toggle label={`${label} — ${autoLabel}`} checked={value !== ""} disabled={disabled} onChange={(on) => onChange(on ? fallback : "")} />
      {value !== "" && <ColorField label={label} value={value} against={against} onChange={onChange} labels={labels} disabled={disabled} />}
    </div>
  );
}

export function BiText({ label, value, onChange, max, names, disabled }: { label: string; value: LocalizedText; onChange: (v: LocalizedText) => void; max: number; names: { arabic: string; english: string }; disabled?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextInput label={`${label} — ${names.arabic}`} dir="rtl" maxLength={max} value={value.ar} disabled={disabled} onChange={(v) => onChange({ ...value, ar: v })} />
      <TextInput label={`${label} — ${names.english}`} dir="ltr" maxLength={max} value={value.en} disabled={disabled} onChange={(v) => onChange({ ...value, en: v })} />
    </div>
  );
}

export interface LinksLabels {
  add: string;
  remove: string;
  up: string;
  down: string;
  text: string;
  href: string;
  hrefHint: string;
  empty: string;
  arabic: string;
  english: string;
}

/** Extra links: each has a text (AR + EN) and an address like /products, /pages/about or https://… */
/** `max`: how many links may be added (default MAX_EXTRA_LINKS) */
export function LinksEditor({ label, value, onChange, labels: L, disabled, max = MAX_EXTRA_LINKS }: { label: string; value: ChromeLink[]; onChange: (v: ChromeLink[]) => void; labels: LinksLabels; disabled?: boolean; max?: number }) {
  const set = (i: number, link: ChromeLink) => onChange(value.map((l, k) => (k === i ? link : l)));
  const move = (i: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    onChange(next);
  };
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  return (
    <Field label={label} hint={L.hrefHint}>
      {value.length === 0 && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{L.empty}</p>}
      <ul className="flex flex-col gap-3">
        {value.map((link, i) => (
          <li key={i} className="flex gap-2 rounded-lg border p-3">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
              <TextInput label={`${L.text} — ${L.arabic}`} dir="rtl" maxLength={60} value={link.label.ar} disabled={disabled} onChange={(v) => set(i, { ...link, label: { ...link.label, ar: v } })} />
              <TextInput label={`${L.text} — ${L.english}`} dir="ltr" maxLength={60} value={link.label.en} disabled={disabled} onChange={(v) => set(i, { ...link, label: { ...link.label, en: v } })} />
              <TextInput label={L.href} dir="ltr" maxLength={300} value={link.href} disabled={disabled} onChange={(v) => set(i, { ...link, href: v.trim() })} />
            </div>
            <div className="flex shrink-0 flex-col">
              <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={L.up} className={iconButton}>
                <ArrowUp className="size-4" />
              </button>
              <button type="button" disabled={disabled || i === value.length - 1} onClick={() => move(i, 1)} aria-label={L.down} className={iconButton}>
                <ArrowDown className="size-4" />
              </button>
              <button type="button" disabled={disabled} onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label={L.remove} className={`${iconButton} text-destructive`}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {value.length < max && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...value, { label: { ar: "", en: "" }, href: "" }])}
          className="inline-flex h-10 items-center gap-1.5 self-start rounded-lg border border-dashed border-gold px-3 text-sm font-semibold text-gold hover:bg-accent disabled:opacity-60"
        >
          <Plus className="size-4" />
          {L.add}
        </button>
      )}
    </Field>
  );
}

/**
 * One row of icons to choose from (all the icons the library has for this slot).
 * `textLabel` = what to show for the "no icon, use text" choice of the language switch.
 */
export function IconPicker({ label, slot, value, onChange, disabled, textLabel = "Aa" }: { label: string; slot: IconSlot; value: string; onChange: (id: string) => void; disabled?: boolean; textLabel?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-semibold text-[#4a443b]">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {Object.entries(ICON_LIBRARY[slot]).map(([id, Icon]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={id === value}
            aria-label={`${label}: ${id}`}
            title={id}
            onClick={() => onChange(id)}
            className={cn(
              "flex size-12 items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
              id === value ? "border-gold bg-accent ring-1 ring-gold" : "border-input bg-card hover:bg-muted",
            )}
          >
            {Icon ? <Icon className="size-5" /> : <span className="text-sm font-semibold">{textLabel}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
