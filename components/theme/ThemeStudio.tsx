/**
 * THEME STUDIO — the "Theme & design" editor (المظهر والتصميم).
 * ------------------------------------------------------------------
 *   [status + Save draft · Publish · Discard · Reset]
 *   [tabs: Brand | Colours | Fonts | Layout | Texts]      [live preview]
 *
 * How saving works:
 *   - Every change updates the preview immediately (nothing is sent yet).
 *   - "Save draft"  -> PUT /api/theme/draft     (safe: the website doesn't change)
 *   - "Publish"     -> saves, then POST /api/theme/publish (the website changes)
 *   - "Discard"     -> DELETE /api/theme/draft  (back to what is live)
 *   - "Reset"       -> loads the default theme into the editor (still needs Save/Publish)
 * Staff with only "view" permission see everything but can't change it.
 *
 * The SAME editor also runs the sidebar pages "Header", "Footer" and "Product filter" (`section` = "header" / "footer" / "filters" / "productPage"):
 * same toolbar and same draft, but it shows HeaderPanel / FooterPanel with a live sketch on top instead of the tabs.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Locale, SiteTheme, SoldOutLook, ThemeState } from "@/types";
import { ARABIC_FONTS, LATIN_FONTS } from "@/types";
import { ARABIC_FONT_OPTIONS, COLOR_PRESETS, DEFAULT_THEME, LATIN_FONT_OPTIONS } from "@/config/theme-defaults";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import { cn } from "@/lib/utils";
import { fill, formatDateTime, t } from "@/lib/format";
import { Choice, ColorField, Field, Slider, TextInput, Toggle } from "./fields";
import { BiText, OptionalColor } from "./chrome-fields";
import { ImageField } from "./ImageField";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { TextsEditor } from "./TextsEditor";
import { ThemePreview } from "./ThemePreview";
import { HeaderPanel, type MenuPageChoice } from "./HeaderPanel";
import { FooterPanel } from "./FooterPanel";
import { ChromePreview } from "./ChromePreview";
import { FiltersPanel, type FilterCategory } from "./FiltersPanel";
import { DEFAULT_FILTERS, DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_PRODUCT_PAGE, parseFilters, parseDarkMode, parseFooter, parseHeader, parseProductCard, parseProductPage, SOLD_OUT_PRESETS, suggestedDarkColors } from "@/lib/theme-chrome";
import { ProductPagePanel } from "./ProductPagePanel";

/** Themes saved before the Header / Footer options existed don't have them → fill in the defaults */
const complete = (t: SiteTheme): SiteTheme => ({ ...t, layout: { ...t.layout, card: parseProductCard(t.layout?.card) }, header: parseHeader(t.header), footer: parseFooter(t.footer), filters: parseFilters(t.filters), productPage: parseProductPage(t.productPage), darkMode: parseDarkMode(t.darkMode, t.colors) });
/** The pages the top menu will show: the chosen ones, or the automatic ones. undefined = no page list here */
const menuPagesOf = (t: SiteTheme, pages: MenuPageChoice[]): MenuPageChoice[] | undefined =>
  !pages.length ? undefined : t.header.menu.pageSlugs ? t.header.menu.pageSlugs.map((slug) => pages.find((p) => p.slug === slug)).filter((p): p is MenuPageChoice => !!p) : pages.filter((p) => p.inHeader && p.live);
/** JSON text with the keys in a fixed order, so "is anything changed?" doesn't depend on how an object was built */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));
const completeState = (s: ThemeState): ThemeState => ({ ...s, published: complete(s.published), draft: s.draft ? complete(s.draft) : null });

type Tab = "brand" | "colors" | "dark" | "typography" | "layout" | "texts";
type ColorKey = keyof SiteTheme["colors"];

/** Colour groups: [colour, colour it must stay readable against] */
const COLOR_GROUPS: { group: string; items: [ColorKey, ColorKey?][] }[] = [
  { group: "main", items: [["primary", "background"], ["primaryForeground", "primary"], ["accent"]] },
  { group: "page", items: [["background"], ["foreground", "background"], ["card"], ["muted"], ["mutedForeground", "background"], ["border"]] },
  { group: "soft", items: [["secondary"], ["secondaryForeground", "secondary"]] },
  // Header and footer colours are edited ONLY in their own pages (sidebar → Header / Footer)
  { group: "status", items: [["danger", "background"]] },
];
/** Dark mode has every colour in one place, top bar and footer included */
const DARK_COLOR_GROUPS: typeof COLOR_GROUPS = [
  ...COLOR_GROUPS.slice(0, 3),
  { group: "header", items: [["headerBackground"], ["headerForeground", "headerBackground"]] },
  { group: "footer", items: [["footerBackground"], ["footerForeground", "footerBackground"]] },
  COLOR_GROUPS[3],
];

// Labels come from lib/i18n/dictionaries/*.json → "theme"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ThemeLabels = any;

export function ThemeStudio({
  initial,
  canEdit,
  locale,
  storefrontUrl,
  labels,
  mediaLabels,
  section = "theme",
  categories = [],
  pages = [],
}: {
  /** "theme" = Theme & design (tabs) · "header" / "footer" = the sidebar pages for the top bar / footer */
  section?: "theme" | "header" | "footer" | "filters" | "productPage";
  /** "Product filter" and "Header" pages: the categories that can be listed (filter / Shop drop-down) */
  categories?: FilterCategory[];
  /** Only for the "Header" page: the pages that can be put in the top menu */
  pages?: MenuPageChoice[];
  initial: ThemeState;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: ThemeLabels;
  mediaLabels: MediaLabels;
}) {
  const [state, setStateRaw] = useState(() => completeState(initial));
  const setState = (s: ThemeState) => setStateRaw(completeState(s));
  const [theme, setThemeRaw] = useState<SiteTheme>(() => complete(initial.draft ?? initial.published));
  const setTheme = (next: SiteTheme | ((t: SiteTheme) => SiteTheme)) => setThemeRaw((t) => complete(typeof next === "function" ? next(t) : next));
  // UNDO / REDO: every change to the theme in this editor (all tabs and the Header / Footer / Filter / Product page forms)
  const history = useUndoRedo(theme, setTheme);
  const [tab, setTab] = useState<Tab>("brand");
  const [busy, setBusy] = useState<"save" | "publish" | "discard" | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string; details?: string[] } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const saved = state.draft ?? state.published;
  const dirty = useMemo(() => stable(theme) !== stable(saved), [theme, saved]);
  const hasDraft = !!state.draft;
  const L = labels;

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ---------- update helpers ---------- */
  const setBrand = <K extends keyof SiteTheme["brand"]>(k: K, v: SiteTheme["brand"][K]) => setTheme((t) => ({ ...t, brand: { ...t.brand, [k]: v } }));
  const setColor = (k: ColorKey, v: string) => setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const setType = <K extends keyof SiteTheme["typography"]>(k: K, v: SiteTheme["typography"][K]) => setTheme((t) => ({ ...t, typography: { ...t.typography, [k]: v } }));
  const setLayout = <K extends keyof SiteTheme["layout"]>(k: K, v: SiteTheme["layout"][K]) => setTheme((t) => ({ ...t, layout: { ...t.layout, [k]: v } }));

  /* ---------- server actions ---------- */
  async function saveDraft(): Promise<boolean> {
    setBusy("save");
    setMessage(null);
    const res = await fetch("/api/theme/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(theme) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok && data.state) {
      setState(data.state);
      setMessage({ kind: "ok", text: L.messages.saved });
      return true;
    }
    setMessage({ kind: "error", text: L.messages.error, details: (data.issues ?? []).map((i: { path: string }) => i.path) });
    return false;
  }

  async function publish() {
    if ((dirty || !hasDraft) && !(await saveDraft())) return;
    setBusy("publish");
    const res = await fetch("/api/theme/publish", { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok && data.state) {
      setState(data.state);
      setTheme(data.state.published);
      setMessage({ kind: "ok", text: L.messages.published });
    } else setMessage({ kind: "error", text: L.messages.error });
  }

  async function discard() {
    setBusy("discard");
    const res = await fetch("/api/theme/draft", { method: "DELETE" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok && data.state) {
      setState(data.state);
      setTheme(data.state.published);
      setMessage({ kind: "ok", text: L.messages.discarded });
    }
  }

  /* ---------- status line ---------- */
  const status = dirty
    ? L.status.unsaved
    : hasDraft && state.draftSavedAt
      ? fill(L.status.draftSaved, { time: formatDateTime(state.draftSavedAt, locale) })
      : state.publishedAt
        ? fill(L.status.publishedAt, { time: formatDateTime(state.publishedAt, locale), by: state.publishedBy ? t(state.publishedBy, locale) : "—" })
        : L.status.never;

  const disabled = !canEdit;
  const tabs: Tab[] = ["brand", "colors", "dark", "typography", "layout", "texts"];

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Toolbar ===== */}
      <div className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-18 lg:-mx-7 lg:px-7">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{L.status.live}</span>
          <span className={cn("text-xs", dirty || hasDraft ? "text-[var(--status-progress-fg)]" : "text-muted-foreground")}>{status}</span>
        </div>
        <a href={storefrontUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-gold hover:bg-muted">
          <ExternalLink className="size-4" />
          {L.actions.viewSite}
        </a>
        {canEdit && <UndoRedo history={history} keyboard disabled={!!busy} />}
        {canEdit && (
          <>
            {hasDraft && (
              <button type="button" disabled={!!busy} onClick={discard} className="h-10 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc] disabled:opacity-60">
                {L.actions.discard}
              </button>
            )}
            <button type="button" disabled={!!busy || !dirty} onClick={saveDraft} className="h-10 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {busy === "save" ? L.actions.saving : L.actions.save}
            </button>
            <button type="button" disabled={!!busy || (!dirty && !hasDraft)} onClick={publish} className="h-10 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50">
              {busy === "publish" ? L.actions.publishing : L.actions.publish}
            </button>
          </>
        )}
      </div>

      {message && (
        <div role="status" className={cn("rounded-lg px-4 py-3 text-sm", message.kind === "ok" ? "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]" : "bg-[#f6e0dc] text-destructive")}>
          {message.text}
          {message.details && message.details.length > 0 && (
            <span dir="ltr" className="mt-1 block font-mono text-xs">
              {message.details.join(", ")}
            </span>
          )}
        </div>
      )}
      {!canEdit && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{L.preview.noAccess}</p>}

      {/* ===== Header / Footer pages: live sketch on top, then the options ===== */}
      {/* ===== Product page: which parts show, photo side, main button ===== */}
      {section === "productPage" && (
        <div className="flex flex-col gap-5">
          <ProductPagePanel theme={theme} setTheme={setTheme} labels={L} disabled={disabled} />
          {canEdit && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setTheme((t) => ({ ...t, productPage: structuredClone(DEFAULT_PRODUCT_PAGE) }))} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-muted">
                {L.chrome.reset.productPage}
              </button>
            </div>
          )}
        </div>
      )}

      {section === "filters" && (
        <div className="flex flex-col gap-5">
          <FiltersPanel theme={theme} setTheme={setTheme} categories={categories} labels={L} disabled={disabled} />
          {canEdit && (
            <div className="flex justify-end">
              <button type="button" onClick={() => setTheme((t) => ({ ...t, filters: structuredClone(DEFAULT_FILTERS) }))} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-muted">
                {L.chrome.reset.filters}
              </button>
            </div>
          )}
        </div>
      )}

      {(section === "header" || section === "footer") && (
        <div className="flex flex-col gap-5">
          {/* The header sketch is short, so it stays in view while scrolling the options */}
          <div className={cn(section === "header" && "sticky top-32 z-10 -mx-1 rounded-xl bg-background/95 px-1 pb-2 backdrop-blur lg:top-36")}>
            <ChromePreview menuPages={menuPagesOf(theme, pages)} part={section} theme={theme} locale={locale} storefrontUrl={storefrontUrl} labels={L} />
          </div>
          {section === "header" ? (
            <HeaderPanel pages={pages} categories={categories.filter((c) => !c.isChild)} theme={theme} setTheme={setTheme} labels={L} mediaLabels={mediaLabels} locale={locale} storefrontUrl={storefrontUrl} disabled={disabled} />
          ) : (
            <FooterPanel theme={theme} setTheme={setTheme} labels={L} mediaLabels={mediaLabels} locale={locale} storefrontUrl={storefrontUrl} disabled={disabled} />
          )}
          {canEdit && (
            <div className="flex justify-end">
              {confirmReset ? (
                <button
                  type="button"
                  onClick={() => {
                    // Only this part goes back to the original design (colours and logo are not touched)
                    setTheme((t) => (section === "header" ? { ...t, header: structuredClone(DEFAULT_HEADER) } : { ...t, footer: structuredClone(DEFAULT_FOOTER) }));
                    setConfirmReset(false);
                  }}
                  className="h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-white"
                >
                  {L.actions.resetConfirm}
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-muted">
                  {L.chrome.reset[section]}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]", section !== "theme" && "hidden")}>
        {/* ===== Editor ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b">
            {tabs.map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn(
                  "h-11 shrink-0 border-b-[3px] px-3 text-sm whitespace-nowrap",
                  tab === k ? "border-gold font-bold" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {L.tabs[k]}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="flex flex-col gap-5 rounded-xl border bg-card p-4 sm:p-5">
            {(tab === "brand" || tab === "colors" || tab === "layout") && (
              <p className="rounded-lg bg-accent px-3 py-2 text-sm">
                {L.chrome.moved}{" "}
                <Link href="/header" className="font-semibold text-gold hover:underline">
                  {L.chrome.goHeader}
                </Link>{" "}
                ·{" "}
                <Link href="/footer" className="font-semibold text-gold hover:underline">
                  {L.chrome.goFooter}
                </Link>
              </p>
            )}
            {tab === "brand" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label={`${L.brand.name} — ${L.brand.arabic}`} dir="rtl" maxLength={80} value={theme.brand.name.ar} disabled={disabled} onChange={(v) => setBrand("name", { ...theme.brand.name, ar: v })} />
                  <TextInput label={`${L.brand.name} — ${L.brand.english}`} dir="ltr" maxLength={80} value={theme.brand.name.en} disabled={disabled} onChange={(v) => setBrand("name", { ...theme.brand.name, en: v })} />
                  <TextInput label={`${L.brand.tagline} — ${L.brand.arabic}`} dir="rtl" maxLength={160} value={theme.brand.tagline.ar} disabled={disabled} onChange={(v) => setBrand("tagline", { ...theme.brand.tagline, ar: v })} />
                  <TextInput label={`${L.brand.tagline} — ${L.brand.english}`} dir="ltr" maxLength={160} value={theme.brand.tagline.en} disabled={disabled} onChange={(v) => setBrand("tagline", { ...theme.brand.tagline, en: v })} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* The logo (header) and the footer logo are edited ONLY in sidebar → Header / Footer */}
                  <ImageField frame="favicon" label={L.brand.favicon} hint={L.brand.faviconHint} value={theme.brand.favicon} onChange={(v) => setBrand("favicon", v)} storefrontUrl={storefrontUrl} labels={L.media} mediaLabels={mediaLabels} locale={locale} disabled={disabled} />
                  <ImageField frame="share" label={L.brand.shareImage} hint={L.brand.shareImageHint} value={theme.brand.shareImage} onChange={(v) => setBrand("shareImage", v)} storefrontUrl={storefrontUrl} labels={L.media} mediaLabels={mediaLabels} locale={locale} disabled={disabled} />
                </div>
              </>
            )}

            {tab === "colors" && (
              <>
                <Field label={L.colors.presets}>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((p) => {
                      // A ready-made palette changes the site colours but NOT the header / footer (they have their own pages)
                      const { headerBackground, headerForeground, footerBackground, footerForeground } = theme.colors;
                      const colors = { ...DEFAULT_THEME.colors, ...p.colors, headerBackground, headerForeground, footerBackground, footerForeground };
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => setTheme((t) => ({ ...t, colors }))}
                          className="flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm hover:bg-muted disabled:opacity-60"
                        >
                          <span className="flex">
                            {[colors.primary, colors.accent, colors.secondary].map((col, i) => (
                              <span key={i} className="-ms-1 size-5 rounded-full border-2 border-card first:ms-0" style={{ background: col }} />
                            ))}
                          </span>
                          {p.label[locale]}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                {COLOR_GROUPS.map(({ group, items }) => (
                  <fieldset key={group} className="flex flex-col gap-3 border-t pt-4">
                    <legend className="pb-2 font-heading text-base font-bold">{L.colors.groups[group]}</legend>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map(([key, against]) => (
                        <ColorField
                          key={key}
                          label={L.colors.names[key]}
                          value={theme.colors[key]}
                          against={against ? theme.colors[against] : undefined}
                          onChange={(v) => setColor(key, v)}
                          labels={L.colors}
                          disabled={disabled}
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </>
            )}

            {/* ===== DARK MODE: on / off, what visitors see first, and the dark colours ===== */}
            {tab === "dark" && (
              <>
                <Toggle label={L.dark.enabled} checked={theme.darkMode.enabled} disabled={disabled} onChange={(v) => setTheme((t) => ({ ...t, darkMode: { ...t.darkMode, enabled: v } }))} />
                <p className="-mt-3 text-xs text-muted-foreground">{L.dark.enabledHint}</p>
                {theme.darkMode.enabled && (
                  <>
                    <Choice
                      label={L.dark.first}
                      value={theme.darkMode.default}
                      disabled={disabled}
                      options={(["light", "dark"] as const).map((v) => ({ value: v, label: L.dark.modes[v] }))}
                      onChange={(v) => setTheme((t) => ({ ...t, darkMode: { ...t.darkMode, default: v } }))}
                    />
                    <p className="-mt-3 text-xs text-muted-foreground">{L.dark.firstHint}</p>
                    {DARK_COLOR_GROUPS.map(({ group, items }) => (
                      <fieldset key={group} className="flex flex-col gap-3 border-t pt-4">
                        <legend className="pb-2 font-heading text-base font-bold">{L.colors.groups[group]}</legend>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          {items.map(([key, against]) => (
                            <ColorField
                              key={key}
                              label={L.colors.names[key]}
                              value={theme.darkMode.colors[key]}
                              against={against ? theme.darkMode.colors[against] : undefined}
                              onChange={(v) => setTheme((t) => ({ ...t, darkMode: { ...t.darkMode, colors: { ...t.darkMode.colors, [key]: v } } }))}
                              labels={L.colors}
                              disabled={disabled}
                            />
                          ))}
                        </div>
                      </fieldset>
                    ))}
                    {canEdit && (
                      <div className="flex justify-end border-t pt-4">
                        <button type="button" onClick={() => setTheme((t) => ({ ...t, darkMode: { ...t.darkMode, colors: suggestedDarkColors(t.colors) } }))} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-muted">
                          {L.dark.reset}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {tab === "typography" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["arabicFont", ARABIC_FONTS, ARABIC_FONT_OPTIONS, "rtl"],
                      ["arabicHeadingFont", ARABIC_FONTS, ARABIC_FONT_OPTIONS, "rtl"],
                      ["latinFont", LATIN_FONTS, LATIN_FONT_OPTIONS, "ltr"],
                      ["latinHeadingFont", LATIN_FONTS, LATIN_FONT_OPTIONS, "ltr"],
                    ] as const
                  ).map(([key, list, options, dir]) => (
                    <Field key={key} label={L.typography[key]} htmlFor={`font-${key}`}>
                      <select
                        id={`font-${key}`}
                        value={theme.typography[key]}
                        disabled={disabled}
                        onChange={(e) => setType(key, e.target.value as never)}
                        className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
                      >
                        {list.map((f) => (
                          <option key={f} value={f}>
                            {(options as Record<string, { label: string }>)[f].label}
                          </option>
                        ))}
                      </select>
                      <span
                        dir={dir}
                        className="rounded-lg bg-muted px-3 py-2 text-lg"
                        style={{ fontFamily: `"${(options as Record<string, { google: string }>)[theme.typography[key]].google}"`, fontWeight: key.includes("Heading") ? theme.typography.headingWeight : 400 }}
                      >
                        {dir === "rtl" ? "ذهب ومجوهرات بتصميمات فريدة ١٢٣" : "Fine gold & jewelry 123"}
                      </span>
                    </Field>
                  ))}
                </div>
                <Slider label={L.typography.baseSize} hint={L.typography.baseSizeHint} value={theme.typography.baseSize} min={14} max={18} step={1} unit="px" disabled={disabled} onChange={(v) => setType("baseSize", v)} />
                <Choice
                  label={L.typography.headingWeight}
                  value={theme.typography.headingWeight}
                  disabled={disabled}
                  options={([400, 500, 600, 700, 800] as const).map((w) => ({ value: w, label: L.typography.weights[w] }))}
                  onChange={(v) => setType("headingWeight", v)}
                />
                <Slider label={L.typography.lineHeight} value={theme.typography.lineHeight} min={1.3} max={2} step={0.05} disabled={disabled} onChange={(v) => setType("lineHeight", Math.round(v * 100) / 100)} />
                <Slider label={L.typography.letterSpacing} value={theme.typography.headingLetterSpacing} min={-0.02} max={0.1} step={0.01} unit="em" disabled={disabled} onChange={(v) => setType("headingLetterSpacing", Math.round(v * 100) / 100)} />
              </>
            )}

            {tab === "layout" && (
              <>
                <Choice
                  label={L.layout.containerWidth}
                  value={theme.layout.containerWidth}
                  disabled={disabled}
                  options={([1152, 1280, 1440, 1600] as const).map((w) => ({ value: w, label: `${w}px` }))}
                  onChange={(v) => setLayout("containerWidth", v)}
                />
                <Slider label={L.layout.radius} hint={L.layout.radiusHint} value={theme.layout.radius} min={0} max={24} step={1} unit="px" disabled={disabled} onChange={(v) => setLayout("radius", v)} />
                {/* "Header stays on top" moved to sidebar → Header */}
                <Choice
                  label={L.layout.productCard}
                  value={theme.layout.productCard}
                  disabled={disabled}
                  options={[
                    { value: "detailed", label: L.layout.cardDetailed },
                    { value: "minimal", label: L.layout.cardMinimal },
                  ]}
                  onChange={(v) => setLayout("productCard", v)}
                />
                <Choice
                  label={L.layout.imageRatio}
                  value={theme.layout.productImageRatio}
                  disabled={disabled}
                  options={[
                    { value: "square", label: L.layout.square },
                    { value: "portrait", label: L.layout.portrait },
                  ]}
                  onChange={(v) => setLayout("productImageRatio", v)}
                />
                <Choice
                  label={L.layout.gridColumns}
                  value={theme.layout.gridColumns}
                  disabled={disabled}
                  options={([3, 4, 5] as const).map((n) => ({ value: n, label: String(n) }))}
                  onChange={(v) => setLayout("gridColumns", v)}
                />
                {/* The small page path at the top of pages: "Home / Categories / Rings" */}
                <Toggle label={L.layout.breadcrumbs} checked={theme.layout.breadcrumbs !== false} disabled={disabled} onChange={(v) => setLayout("breadcrumbs", v)} />
                <p className="-mt-2 text-xs text-muted-foreground">{L.layout.breadcrumbsHint}</p>

                {/* ===== Product cards ===== (storefront/components/product/ProductCard.tsx) */}
                <div className="flex flex-col gap-4 border-t pt-4">
                  <p className="text-sm font-bold">{L.layout.card.title}</p>
                  <Choice label={L.layout.card.align} value={theme.layout.card.align} disabled={disabled} options={(["start", "center"] as const).map((v) => ({ value: v, label: L.layout.card.aligns[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, align: v })} />
                  <Choice label={L.layout.card.nameSize} value={theme.layout.card.nameSize} disabled={disabled} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: L.layout.card.sizes[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, nameSize: v })} />
                  <Choice label={L.layout.card.soldOut} value={theme.layout.card.soldOut} disabled={disabled} options={(["badge", "overlay"] as const).map((v) => ({ value: v, label: L.layout.card.soldOuts[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, soldOut: v })} />
                  {theme.layout.card.soldOut === "overlay" && <SoldOutEditor theme={theme} setLayout={setLayout} labels={L} locale={locale} disabled={disabled} />}
                  <Toggle label={L.layout.card.hoverImage} checked={theme.layout.card.hoverImage} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, hoverImage: v })} />
                  <Toggle label={L.layout.card.fromPrice} checked={theme.layout.card.fromPrice} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, fromPrice: v })} />
                  <Toggle label={L.layout.card.newBadge} checked={theme.layout.card.newBadge} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, newBadge: v })} />
                  <Toggle label={L.layout.card.frame} checked={theme.layout.card.frame} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, frame: v })} />
                  {/* Dots under the picture (one per photo) · "New" as a small white box · white photos blended in · grey price */}
                  <Toggle label={L.layout.card.imageDots} checked={theme.layout.card.imageDots} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, imageDots: v })} />
                  {theme.layout.card.newBadge && <Choice label={L.layout.card.badgeLook} value={theme.layout.card.badgeLook} disabled={disabled} options={(["pill", "box"] as const).map((v) => ({ value: v, label: L.layout.card.badgeLooks[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, badgeLook: v })} />}
                  <Toggle label={L.layout.card.blendImage} checked={theme.layout.card.blendImage} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, blendImage: v })} />
                  <p className="-mt-2 text-xs text-muted-foreground">{L.layout.card.blendImageHint}</p>
                  <Choice label={L.layout.card.priceColor} value={theme.layout.card.priceColor} disabled={disabled} options={(["primary", "muted"] as const).map((v) => ({ value: v, label: L.layout.card.priceColors[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, priceColor: v })} />
                  <OptionalColor label={L.layout.card.imageBackground} autoLabel={L.chrome.chooseColor} value={theme.layout.card.imageBackground} fallback="#FFFFFF" onChange={(v) => setLayout("card", { ...theme.layout.card, imageBackground: v })} labels={L.colors} disabled={disabled} />
                  {/* "Choose option" bar that slides up over the picture on mouse-over */}
                  <Toggle label={L.layout.card.hoverButton} checked={theme.layout.card.hoverButton.show} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, hoverButton: { ...theme.layout.card.hoverButton, show: v } })} />
                  {theme.layout.card.hoverButton.show && (
                    <BiText label={L.layout.card.hoverButtonText} value={theme.layout.card.hoverButton.label} max={40} names={L.brand} disabled={disabled} onChange={(label) => setLayout("card", { ...theme.layout.card, hoverButton: { ...theme.layout.card.hoverButton, label } })} />
                  )}
                  {/* Price look: size, own currency sign ("LE"), piastres (".00") */}
                  <Choice label={L.layout.card.priceSize} value={theme.layout.card.priceSize} disabled={disabled} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: L.layout.card.sizes[v] }))} onChange={(v) => setLayout("card", { ...theme.layout.card, priceSize: v })} />
                  <BiText label={L.layout.card.priceSymbol} value={theme.layout.card.priceSymbol} max={8} names={L.brand} disabled={disabled} onChange={(priceSymbol) => setLayout("card", { ...theme.layout.card, priceSymbol })} />
                  <p className="-mt-2 text-xs text-muted-foreground">{L.layout.card.priceSymbolHint}</p>
                  <Toggle label={L.layout.card.priceDecimals} checked={theme.layout.card.priceDecimals} disabled={disabled} onChange={(v) => setLayout("card", { ...theme.layout.card, priceDecimals: v })} />
                </div>
              </>
            )}

            {tab === "texts" && <TextsEditor value={theme.texts} onChange={(texts) => setTheme((t) => ({ ...t, texts }))} labels={L.texts} disabled={disabled} />}
          </div>

          {canEdit && (
            <div className="flex justify-end">
              {confirmReset ? (
                <button
                  type="button"
                  onClick={() => {
                    setTheme(structuredClone(DEFAULT_THEME));
                    setConfirmReset(false);
                  }}
                  className="h-10 rounded-lg bg-destructive px-4 text-sm font-semibold text-white"
                >
                  {L.actions.resetConfirm}
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmReset(true)} className="h-10 rounded-lg px-4 text-sm font-semibold text-muted-foreground hover:bg-muted">
                  {L.actions.reset}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===== Preview ===== */}
        <div className="xl:sticky xl:top-40 xl:self-start">
          {/* On the "Dark mode" tab the sketch shows the dark colours */}
          <ThemePreview theme={tab === "dark" && theme.darkMode.enabled ? { ...theme, colors: theme.darkMode.colors } : theme} storefrontUrl={storefrontUrl} labels={L.preview} />
        </div>
      </div>
    </div>
  );
}

/**
 * "SOLD OUT" LOOK — shade over the picture + the label on it (storefront components/product/ProductCard.tsx).
 * Ready-made looks first (lib/theme-chrome.ts → SOLD_OUT_PRESETS), then every detail, with a live sample.
 */
function SoldOutEditor({
  theme,
  setLayout,
  labels: L,
  locale,
  disabled,
}: {
  theme: SiteTheme;
  setLayout: <K extends keyof SiteTheme["layout"]>(k: K, v: SiteTheme["layout"][K]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labels: any;
  locale: Locale;
  disabled: boolean;
}) {
  const so = theme.layout.card.soldOutLook;
  const S = L.layout.card.so;
  const set = (patch: Partial<SoldOutLook>) => setLayout("card", { ...theme.layout.card, soldOutLook: { ...so, ...patch } });
  const shade = so.shade || theme.colors.primary;
  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <p className="text-sm font-bold">{S.title}</p>
      {/* Ready-made looks */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SOLD_OUT_PRESETS) as (keyof typeof SOLD_OUT_PRESETS)[]).map((k) => (
          <button key={k} type="button" disabled={disabled} onClick={() => set(SOLD_OUT_PRESETS[k])} className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-60">
            {S.presets[k]}
          </button>
        ))}
      </div>
      {/* Live sample */}
      <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-md border" style={{ background: "linear-gradient(135deg,#d9c08a,#8a6420)" }}>
        <div
          className={cn("absolute inset-0 flex justify-center", { center: "items-center", top: "items-start pt-3", bottom: "items-end pb-3" }[so.position])}
          style={{ background: so.strength ? `color-mix(in srgb, ${shade} ${so.strength}%, transparent)` : undefined, filter: so.grayscale ? "grayscale(1)" : undefined }}
        >
          <span
            className={cn("font-medium", { sm: "px-2 py-0.5 text-[10px]", md: "px-3 py-1 text-xs", lg: "px-4 py-1.5 text-sm" }[so.size], { square: "", rounded: "rounded-md", pill: "rounded-full" }[so.shape], so.border && "border")}
            style={{ background: so.labelBackground || "#FFFFFF", color: so.labelText || "#000000" }}
          >
            {so.label[locale] || S.sample}
          </span>
        </div>
      </div>
      <OptionalColor label={S.shade} autoLabel={L.chrome.chooseColor} value={so.shade} fallback={theme.colors.primary} onChange={(v) => set({ shade: v })} labels={L.colors} disabled={disabled} />
      <Slider label={S.strength} value={so.strength} min={0} max={80} step={5} unit="%" disabled={disabled} onChange={(v) => set({ strength: v })} />
      <Toggle label={S.grayscale} checked={so.grayscale} disabled={disabled} onChange={(v) => set({ grayscale: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionalColor label={S.labelBackground} autoLabel={L.chrome.chooseColor} value={so.labelBackground} fallback="#FFFFFF" onChange={(v) => set({ labelBackground: v })} labels={L.colors} disabled={disabled} />
        <OptionalColor label={S.labelText} autoLabel={L.chrome.chooseColor} value={so.labelText} fallback="#000000" against={so.labelBackground || "#FFFFFF"} onChange={(v) => set({ labelText: v })} labels={L.colors} disabled={disabled} />
      </div>
      <BiText label={S.label} value={so.label} max={30} names={L.brand} disabled={disabled} onChange={(label) => set({ label })} />
      <Choice label={S.shape} value={so.shape} disabled={disabled} options={(["square", "rounded", "pill"] as const).map((v) => ({ value: v, label: S.shapes[v] }))} onChange={(v) => set({ shape: v })} />
      <Choice label={S.position} value={so.position} disabled={disabled} options={(["top", "center", "bottom"] as const).map((v) => ({ value: v, label: S.positions[v] }))} onChange={(v) => set({ position: v })} />
      <Choice label={S.size} value={so.size} disabled={disabled} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: L.layout.card.sizes[v] }))} onChange={(v) => set({ size: v })} />
      <Toggle label={S.border} checked={so.border} disabled={disabled} onChange={(v) => set({ border: v })} />
    </div>
  );
}
