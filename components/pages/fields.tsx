/**
 * PAGE EDITOR FIELDS — small inputs used by every section form.
 * Every text field edits ONE language at a time (the "Editing: Arabic / English" switch at the top);
 * under it, the other language's text is shown in grey, to help translating.
 *   <LText>   one-line text        <LArea>  multi-line text        <LHtml>  formatted text (rich text editor)
 *   <LinkEditor>  button text + where it opens        <ItemList>  repeating items (add / move / remove)
 */
"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { CtaLink, Locale, LocalizedText } from "@/types";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./RichTextEditor";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export interface EditorCtx {
  lang: Locale;
  disabled: boolean;
  /** Field names of the current section that must be filled before publishing */
  missing: Set<string>;
  labels: {
    fields: Dictionary["sitePages"]["fields"];
    rte: Dictionary["sitePages"]["rte"];
    otherLang: string;
  };
  /** For the button "opens" choices (and the homepage category / product blocks) */
  categories: { id: string; slug: string; name: string }[];
  pages: { path: string; name: string }[];
  /** Products a button can open ("Opens a product") */
  linkProducts?: { slug: string; name: string; sku: string }[];
  /** Homepage only: products for "choose products", collections, karats in the gold price feed */
  products?: { id: string; name: string; sku: string; imageUrl?: string; visible: boolean }[];
  brands?: { id: string; name: string }[];
  karats?: number[];
}

const box = "w-full rounded-lg border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted";
const other = (lang: Locale): Locale => (lang === "ar" ? "en" : "ar");

function Shell({ label, invalid, hint, htmlFor, children }: { label: string; invalid?: boolean; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className={cn("text-sm font-semibold", invalid && "text-destructive")}>
        {label}
      </label>
      {children}
      {hint && (
        <span dir="auto" className="line-clamp-2 text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}

const hintFor = (ctx: EditorCtx, value?: LocalizedText) => {
  const o = value?.[other(ctx.lang)]?.replace(/<[^>]*>/g, " ").trim();
  return o ? `${ctx.labels.otherLang}: ${o}` : undefined;
};

export function LText({ ctx, label, value, onChange, name, max = 150 }: { ctx: EditorCtx; label: string; value?: LocalizedText; onChange: (v: LocalizedText) => void; name?: string; max?: number }) {
  const id = useId();
  const invalid = !!name && ctx.missing.has(name) && !value?.[ctx.lang]?.trim();
  return (
    <Shell label={label} invalid={invalid} hint={hintFor(ctx, value)} htmlFor={id}>
      <input
        id={id}
        dir={ctx.lang === "ar" ? "rtl" : "ltr"}
        disabled={ctx.disabled}
        maxLength={max}
        value={value?.[ctx.lang] ?? ""}
        onChange={(e) => onChange({ ar: value?.ar ?? "", en: value?.en ?? "", [ctx.lang]: e.target.value })}
        className={cn(box, "h-11", invalid ? "border-destructive" : "border-input")}
      />
    </Shell>
  );
}

export function LArea({ ctx, label, value, onChange, name, max = 400 }: { ctx: EditorCtx; label: string; value?: LocalizedText; onChange: (v: LocalizedText) => void; name?: string; max?: number }) {
  const id = useId();
  const invalid = !!name && ctx.missing.has(name) && !value?.[ctx.lang]?.trim();
  return (
    <Shell label={label} invalid={invalid} hint={hintFor(ctx, value)} htmlFor={id}>
      <textarea
        id={id}
        dir={ctx.lang === "ar" ? "rtl" : "ltr"}
        rows={3}
        disabled={ctx.disabled}
        maxLength={max}
        value={value?.[ctx.lang] ?? ""}
        onChange={(e) => onChange({ ar: value?.ar ?? "", en: value?.en ?? "", [ctx.lang]: e.target.value })}
        className={cn(box, "py-2 leading-relaxed", invalid ? "border-destructive" : "border-input")}
      />
    </Shell>
  );
}

export function LHtml({ ctx, label, value, onChange, name, editorKey }: { ctx: EditorCtx; label: string; value?: LocalizedText; onChange: (v: LocalizedText) => void; name?: string; editorKey: string }) {
  const text = (value?.[ctx.lang] ?? "").replace(/<[^>]*>/g, "").trim();
  const invalid = !!name && ctx.missing.has(name) && !text;
  return (
    <Shell label={label} invalid={invalid} hint={hintFor(ctx, value)}>
      <RichTextEditor
        key={`${editorKey}-${ctx.lang}`}
        value={value?.[ctx.lang] ?? ""}
        onChange={(html) => onChange({ ar: value?.ar ?? "", en: value?.en ?? "", [ctx.lang]: html })}
        dir={ctx.lang === "ar" ? "rtl" : "ltr"}
        label={label}
        labels={ctx.labels.rte}
        disabled={ctx.disabled}
        invalid={invalid}
      />
    </Shell>
  );
}

/**
 * BUTTON EDITOR — the button's text, then two clear steps:
 *   1) "What does the button do?"  -> opens a page · a category · a product · WhatsApp chat · phone call · email · another website
 *   2) "Where exactly?"            -> the page / category / product is picked from a list; WhatsApp / call / email ask for the number or address
 * What is saved is just an address (href), e.g. "/products?offer=1", "/categories/rings", "https://wa.me/2010…", "tel:+2010…".
 *   - To add a fixed page to the list: SITE_PLACES below (+ its text in dictionaries → sitePages.fields.places)
 *   - To add a new kind of action: KINDS + kindOf + the matching box at the bottom
 */
const SITE_PLACES = ["/", "/products", "/products?offer=1", "/categories", "/contact", "/cart", "/account"] as const;
const KINDS = ["page", "category", "product", "whatsapp", "call", "email", "url"] as const;
type LinkKind = (typeof KINDS)[number];
const digits = (v: string) => v.replace(/[^0-9]/g, "");

export function LinkEditor({ ctx, label, value, onChange, optional, invalid }: { ctx: EditorCtx; label: string; value?: CtaLink; onChange: (v: CtaLink | undefined) => void; optional?: boolean; invalid?: boolean }) {
  const F = ctx.labels.fields;
  const id = useId();
  const link = value ?? { label: { ar: "", en: "" }, href: "" };
  const href = link.href;
  const products = ctx.linkProducts ?? [];
  const set = (patch: Partial<CtaLink>) => onChange({ ...link, ...patch });

  // Which action the saved address is
  const kindOf = (h: string): LinkKind | "" =>
    !h
      ? ""
      : h.startsWith("https://wa.me/")
        ? "whatsapp"
        : h.startsWith("tel:")
          ? "call"
          : h.startsWith("mailto:")
            ? "email"
            : h.startsWith("/categories/")
              ? "category"
              : h.startsWith("/products/")
                ? "product"
                : (SITE_PLACES as readonly string[]).includes(h) || ctx.pages.some((p) => p.path === h)
                  ? "page"
                  : "url";
  const kind = kindOf(href) || (optional ? "" : "page");
  /** First address of a kind, used when the action is switched */
  const start: Record<LinkKind, string> = {
    page: "/products",
    category: `/categories/${ctx.categories[0]?.slug ?? ""}`,
    product: `/products/${products[0]?.slug ?? ""}`,
    whatsapp: "https://wa.me/",
    call: "tel:",
    email: "mailto:",
    url: "https://",
  };
  // WhatsApp address = number + optional ready message
  const wa = kind === "whatsapp" ? { number: href.slice("https://wa.me/".length).split("?")[0], text: decodeURIComponent(href.split("?text=")[1] ?? "") } : { number: "", text: "" };
  const setWa = (number: string, text: string) => set({ href: `https://wa.me/${digits(number)}${text ? `?text=${encodeURIComponent(text)}` : ""}` });
  const kinds = KINDS.filter((k) => (k === "product" ? products.length > 0 : k === "category" ? ctx.categories.length > 0 : true));
  const chip = (on: boolean) => cn("h-9 rounded-full border px-3 text-sm disabled:opacity-60", on ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted");
  const field = cn(box, "h-11 border-input");

  return (
    <fieldset className={cn("flex flex-col gap-3 rounded-lg border p-3", invalid && "border-destructive")}>
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <LText ctx={ctx} label={F.buttonText} value={link.label} onChange={(v) => set({ label: v })} max={60} />

      {/* 1) What does the button do? */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{F.buttonDoes}</span>
        <div role="radiogroup" aria-label={F.buttonDoes} className="flex flex-wrap gap-1.5">
          {kinds.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} disabled={ctx.disabled} onClick={() => kind !== k && set({ href: start[k] })} className={chip(kind === k)}>
              {F.linkKinds[k]}
            </button>
          ))}
          {optional && (
            <button type="button" role="radio" aria-checked={kind === ""} disabled={ctx.disabled} onClick={() => onChange(undefined)} className={chip(kind === "")}>
              {F.linkKinds.none}
            </button>
          )}
        </div>
      </div>

      {/* 2) Where exactly? */}
      {kind === "page" && (
        <Shell label={F.buttonWhere} htmlFor={id}>
          <select id={id} disabled={ctx.disabled} value={href} onChange={(e) => set({ href: e.target.value })} className={field}>
            <optgroup label={F.placeGroups.shop}>
              {SITE_PLACES.map((p) => (
                <option key={p} value={p}>
                  {F.places[p]}
                </option>
              ))}
            </optgroup>
            {ctx.pages.length > 0 && (
              <optgroup label={F.placeGroups.pages}>
                {ctx.pages
                  .filter((p) => !(SITE_PLACES as readonly string[]).includes(p.path))
                  .map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </Shell>
      )}
      {kind === "category" && (
        <Shell label={F.chooseCategory} htmlFor={id}>
          <select id={id} disabled={ctx.disabled} value={href.replace("/categories/", "")} onChange={(e) => set({ href: `/categories/${e.target.value}` })} className={field}>
            {ctx.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Shell>
      )}
      {kind === "product" && (
        <Shell label={F.chooseProduct} htmlFor={id}>
          <select id={id} disabled={ctx.disabled} value={href.replace("/products/", "")} onChange={(e) => set({ href: `/products/${e.target.value}` })} className={field}>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} — {p.sku}
              </option>
            ))}
          </select>
        </Shell>
      )}
      {kind === "whatsapp" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Shell label={F.whatsappNumber} hint={F.whatsappHint} htmlFor={id}>
            <input id={id} dir="ltr" inputMode="tel" placeholder="201001234567" disabled={ctx.disabled} maxLength={20} value={wa.number} onChange={(e) => setWa(e.target.value, wa.text)} className={field} />
          </Shell>
          <Shell label={F.whatsappText}>
            <input disabled={ctx.disabled} maxLength={150} value={wa.text} onChange={(e) => setWa(wa.number, e.target.value)} className={field} />
          </Shell>
        </div>
      )}
      {kind === "call" && (
        <Shell label={F.phoneNumber} htmlFor={id}>
          <input id={id} dir="ltr" inputMode="tel" placeholder="+201001234567" disabled={ctx.disabled} maxLength={20} value={href.slice(4)} onChange={(e) => set({ href: `tel:${e.target.value.replace(/[^0-9+]/g, "")}` })} className={field} />
        </Shell>
      )}
      {kind === "email" && (
        <Shell label={F.emailAddress} htmlFor={id}>
          <input id={id} dir="ltr" type="email" placeholder="info@store.com" disabled={ctx.disabled} maxLength={120} value={href.slice(7)} onChange={(e) => set({ href: `mailto:${e.target.value.trim()}` })} className={field} />
        </Shell>
      )}
      {kind === "url" && (
        <Shell label={F.linkTo.url} hint={F.urlHint} htmlFor={id}>
          <input id={id} dir="ltr" placeholder="https://" disabled={ctx.disabled} maxLength={300} value={href} onChange={(e) => set({ href: e.target.value.trim() })} className={field} />
        </Shell>
      )}
    </fieldset>
  );
}

/** Repeating items (numbers, features, questions…) with add / move / remove */
export function ItemList<T>({
  ctx,
  label,
  items,
  onChange,
  make,
  render,
  max = 20,
  invalid,
}: {
  ctx: EditorCtx;
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  render: (item: T, update: (v: T) => void, index: number) => React.ReactNode;
  max?: number;
  invalid?: boolean;
}) {
  const F = ctx.labels.fields;
  const move = (i: number, by: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className={cn("text-sm font-semibold", invalid && "text-destructive")}>{label}</span>
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className={cn("flex gap-2 rounded-lg border bg-muted/30 p-3", invalid && "border-destructive/60")}>
            <span className="mt-2 w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-3">{render(item, (v) => onChange(items.map((x, k) => (k === i ? v : x))), i)}</div>
            {!ctx.disabled && (
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label={`${F.items} ${i + 1} ↑`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 hover:bg-card disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" aria-label={`${F.items} ${i + 1} ↓`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 hover:bg-card disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" aria-label={`${F.removeItem} ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-destructive hover:bg-[#f6e0dc]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!ctx.disabled && items.length < max && (
        <button type="button" onClick={() => onChange([...items, make()])} className="inline-flex h-9 items-center gap-1 self-start rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <Plus className="size-4" />
          {F.addItem}
        </button>
      )}
    </div>
  );
}

export function Choice<T extends string | number>({ ctx, label, value, options, onChange }: { ctx: EditorCtx; label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={ctx.disabled}
            onClick={() => onChange(o.value)}
            className={cn("h-9 rounded-full border px-3 text-sm", value === o.value ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
