/**
 * HEADER EDITOR — every option of the website's top bar (page /header in the sidebar).
 * ------------------------------------------------------------------
 * Groups: Arrangement · Logo · Colours · Menu links · Menu style · Icons · Announcement strip
 * All values live in the theme (theme.header + a few shared ones: colours, logo, "stays on top"),
 * so "Save draft" / "Publish" in the toolbar work exactly like in Theme & design.
 *
 * Where to edit:
 *   - Options and their defaults  -> types/theme.ts (ThemeHeader) + lib/theme-chrome.ts
 *   - Texts                       -> dictionaries → "theme.header" (and "theme.chrome" for shared words)
 *   - How the website uses them   -> storefront/components/layout/Header.tsx
 */
"use client";

import type { HeaderPlacement, HeaderRow, HeaderZone, Locale, SiteTheme, ThemeHeader } from "@/types";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import { ICON_THEMES } from "@/lib/icon-library";
import { ACTIVE_LINK_STYLES, MAX_MENU_PAGES, SEARCH_PRESETS, orderMenu } from "@/lib/theme-chrome";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Choice, ColorField, Slider, Toggle } from "./fields";
import { ImageField } from "./ImageField";
import { BiText, Group, IconPicker, LinksEditor, OptionalColor } from "./chrome-fields";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = any;

/** A page that can be put in the top menu */
export interface MenuPageChoice {
  slug: string;
  name: string;
  /** false = not published yet (it won't show on the website until it is) */
  live: boolean;
  /** true = set to "Top menu" in Site pages (what "automatic" shows) */
  inHeader: boolean;
}

interface Props {
  /** Pages from Site pages, for "which pages show in the menu" */
  pages: MenuPageChoice[];
  /** Main categories, for "which categories the drop-down lists" */
  categories?: { id: string; name: string; visible?: boolean }[];
  theme: SiteTheme;
  setTheme: (fn: (t: SiteTheme) => SiteTheme) => void;
  labels: Labels;
  mediaLabels: MediaLabels;
  locale: Locale;
  storefrontUrl: string;
  disabled: boolean;
}

export function HeaderPanel({ theme, setTheme, labels: L, mediaLabels, locale, storefrontUrl, disabled, pages, categories = [] }: Props) {
  const h = theme.header;
  const H = L.header;
  const C = L.chrome;
  const set = (patch: Partial<ThemeHeader>) => setTheme((t) => ({ ...t, header: { ...t.header, ...patch } }));
  const setMenu = (patch: Partial<ThemeHeader["menu"]>) => set({ menu: { ...h.menu, ...patch } });
  const setIcons = (patch: Partial<ThemeHeader["icons"]>) => set({ icons: { ...h.icons, ...patch } });
  const setIcon = (slot: keyof ThemeHeader["icons"]["set"], id: string) => setIcons({ set: { ...h.icons.set, [slot]: id } });
  const setTransparent = (patch: Partial<ThemeHeader["transparent"]>) => set({ transparent: { ...h.transparent, ...patch } });
  const setAnn = (patch: Partial<ThemeHeader["announcement"]>) => set({ announcement: { ...h.announcement, ...patch } });
  const setDd = (patch: Partial<ThemeHeader["dropdown"]>) => set({ dropdown: { ...h.dropdown, ...patch } });
  const setSearch = (patch: Partial<ThemeHeader["search"]>) => set({ search: { ...h.search, ...patch } });
  const sb = h.search;
  const S = H.searchBar;
  // Ticked categories of the drop-down, in the order they were ticked (none ticked = all)
  const ddIds = h.menu.categoriesDropdownIds;
  const setColor = (k: "headerBackground" | "headerForeground", v: string) => setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const sizes = (["sm", "md", "lg"] as const).map((v) => ({ value: v, label: C.sizes[v] }));
  const aligns = (["start", "center", "end"] as const).map((v) => ({ value: v, label: C.aligns[v] }));

  /* ----- Free positions ----- */
  const b = h.builder;
  const setB = (patch: Partial<ThemeHeader["builder"]>) => set({ builder: { ...b, ...patch } });
  const setItem = (i: number, patch: Partial<HeaderPlacement>) => setB({ items: b.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  // ↑ / ↓ moves a part before / after the previous / next part that sits in the SAME row and area
  const moveItem = (i: number, by: -1 | 1) => {
    const me = b.items[i];
    let j = i + by;
    while (j >= 0 && j < b.items.length && !(b.items[j].row === me.row && b.items[j].zone === me.zone)) j += by;
    if (j < 0 || j >= b.items.length) return;
    const next = [...b.items];
    [next[i], next[j]] = [next[j], next[i]];
    setB({ items: next });
  };
  const sameSpot = (i: number, by: -1 | 1) => {
    const me = b.items[i];
    for (let j = i + by; j >= 0 && j < b.items.length; j += by) if (b.items[j].row === me.row && b.items[j].zone === me.zone) return true;
    return false;
  };
  const P = H.pos;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      {/* ===== Free positions ===== every part of the header placed in a row (top strip · main · bottom) and an area (start · centre · end) */}
      <div className="xl:col-span-2">
        <Group title={P.title} hint={P.hint}>
          <Toggle label={P.enabled} checked={b.enabled} disabled={disabled} onChange={(v) => setB({ enabled: v })} />
          {b.enabled && (
            <>
              <ul className="flex flex-col gap-2">
                {b.items.map((it, i) => (
                  <li key={it.part} className={cn("flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2", !it.show && "bg-muted/60")}>
                    <label className="flex w-36 cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" className="size-4 accent-[var(--gold)]" disabled={disabled} checked={it.show} onChange={(e) => setItem(i, { show: e.target.checked })} />
                      {P.parts[it.part]}
                    </label>
                    {/* Row */}
                    <select
                      aria-label={`${P.row}: ${P.parts[it.part]}`}
                      disabled={disabled || !it.show}
                      value={it.row}
                      onChange={(e) => setItem(i, { row: e.target.value as HeaderRow })}
                      className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
                    >
                      {(["top", "main", "bottom"] as const).map((r) => (
                        <option key={r} value={r}>
                          {P.rows[r]}
                        </option>
                      ))}
                    </select>
                    {/* Area: start · centre · end */}
                    <div role="radiogroup" aria-label={`${P.zone}: ${P.parts[it.part]}`} className="flex overflow-hidden rounded-lg border">
                      {(["start", "center", "end"] as const).map((z: HeaderZone) => (
                        <button
                          key={z}
                          type="button"
                          role="radio"
                          aria-checked={it.zone === z}
                          disabled={disabled || !it.show}
                          onClick={() => setItem(i, { zone: z })}
                          className={cn("h-9 px-3 text-sm", it.zone === z ? "bg-gold font-semibold text-white" : "bg-card hover:bg-muted")}
                        >
                          {C.aligns[z]}
                        </button>
                      ))}
                    </div>
                    {/* Order inside the same row + area */}
                    <div className="ms-auto flex">
                      <button type="button" aria-label={`${C.links.up}: ${P.parts[it.part]}`} disabled={disabled || !sameSpot(i, -1)} onClick={() => moveItem(i, -1)} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30">
                        <ArrowUp className="size-4" />
                      </button>
                      <button type="button" aria-label={`${C.links.down}: ${P.parts[it.part]}`} disabled={disabled || !sameSpot(i, 1)} onClick={() => moveItem(i, 1)} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30">
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">{P.orderHint}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Choice label={P.topHeight} value={b.topHeight} disabled={disabled} options={(["compact", "normal"] as const).map((v) => ({ value: v, label: H.heights[v] }))} onChange={(v) => setB({ topHeight: v })} />
                <Choice label={P.bottomHeight} value={b.bottomHeight} disabled={disabled} options={(["compact", "normal"] as const).map((v) => ({ value: v, label: H.heights[v] }))} onChange={(v) => setB({ bottomHeight: v })} />
                <Toggle label={P.rowLines} checked={b.rowLines} disabled={disabled} onChange={(v) => setB({ rowLines: v })} />
              </div>
              <p className="text-xs text-muted-foreground">{P.textHint}</p>
            </>
          )}
        </Group>
      </div>

      {/* ===== Arrangement ===== */}
      <Group title={H.groups.layout}>
        {b.enabled && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{P.layoutOff}</p>}
        <Choice label={H.layout} value={h.layout} disabled={disabled} options={(["logo-start", "logo-center", "stacked"] as const).map((v) => ({ value: v, label: H.layouts[v] }))} onChange={(v) => set({ layout: v })} />
        <p className="-mt-2 text-xs text-muted-foreground">{H.layoutHints[h.layout]}</p>
        {h.layout !== "logo-center" && <Choice label={H.menuAlign} value={h.menuAlign} disabled={disabled} options={aligns} onChange={(v) => set({ menuAlign: v })} />}
        <Choice label={H.height} value={h.height} disabled={disabled} options={(["compact", "normal", "tall"] as const).map((v) => ({ value: v, label: H.heights[v] }))} onChange={(v) => set({ height: v })} />
        <Choice label={C.width} value={h.width} disabled={disabled} options={(["boxed", "full"] as const).map((v) => ({ value: v, label: C.widths[v] }))} onChange={(v) => set({ width: v })} />
        <Toggle label={H.sticky} checked={theme.layout.stickyHeader} disabled={disabled} onChange={(v) => setTheme((t) => ({ ...t, layout: { ...t.layout, stickyHeader: v } }))} />
        <Toggle label={H.border} checked={h.border} disabled={disabled} onChange={(v) => set({ border: v })} />
        <Toggle label={H.shadow} checked={h.shadow} disabled={disabled} onChange={(v) => set({ shadow: v })} />
      </Group>

      {/* ===== Logo ===== (same logo as Theme & design → Brand) */}
      <Group title={H.groups.logo}>
        <ImageField
          required
          label={L.brand.logo}
          hint={L.brand.logoHint}
          value={theme.brand.logo}
          onChange={(v) => setTheme((t) => ({ ...t, brand: { ...t.brand, logo: v } }))}
          storefrontUrl={storefrontUrl}
          labels={L.media}
          mediaLabels={mediaLabels}
          locale={locale}
          disabled={disabled}
          crop={{
            shape: theme.brand.logoShape ?? "square",
            onShapeChange: (shape) => setTheme((t) => ({ ...t, brand: { ...t.brand, logoShape: shape } })),
            preview: { background: theme.colors.headerBackground, foreground: theme.colors.headerForeground, name: theme.brand.name[locale] },
            labels: L.cropper,
          }}
        />
        {/* Browser tab icon (same as Theme & design → Brand → Browser tab icon). Empty = the logo */}
        <ImageField
          frame="favicon"
          label={L.brand.favicon}
          hint={L.brand.faviconHint}
          value={theme.brand.favicon}
          onChange={(v) => setTheme((t) => ({ ...t, brand: { ...t.brand, favicon: v } }))}
          storefrontUrl={storefrontUrl}
          labels={L.media}
          mediaLabels={mediaLabels}
          locale={locale}
          disabled={disabled}
        />
        <Choice label={H.logoSize} value={h.logoSize} disabled={disabled} options={sizes} onChange={(v) => set({ logoSize: v })} />
        <Choice label={H.showName} value={h.showName} disabled={disabled} options={(["auto", "show", "hide"] as const).map((v) => ({ value: v, label: H.showNames[v] }))} onChange={(v) => set({ showName: v })} />
        <p className="-mt-2 text-xs text-muted-foreground">{H.showNameHint}</p>
      </Group>

      {/* ===== Colours ===== (the first two are the same as Theme & design → Colours) */}
      <Group title={H.groups.colors}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label={L.colors.names.headerBackground} value={theme.colors.headerBackground} onChange={(v) => setColor("headerBackground", v)} labels={L.colors} disabled={disabled} />
          <ColorField label={L.colors.names.headerForeground} value={theme.colors.headerForeground} against={theme.colors.headerBackground} onChange={(v) => setColor("headerForeground", v)} labels={L.colors} disabled={disabled} />
        </div>
        <OptionalColor label={H.hoverColor} autoLabel={C.chooseColor} value={h.hoverColor} fallback={theme.colors.primary} against={theme.colors.headerBackground} onChange={(v) => set({ hoverColor: v })} labels={L.colors} disabled={disabled} />
        {h.hoverColor === "" && <p className="-mt-2 text-xs text-muted-foreground">{H.hoverAuto}</p>}

        {/* See-through header over the first big picture (homepage slider, title banner with a picture) */}
        <div className="flex flex-col gap-4 border-t pt-4">
          <Toggle label={H.transparent} checked={h.transparent.enabled} disabled={disabled} onChange={(v) => setTransparent({ enabled: v })} />
          <p className="-mt-3 text-xs text-muted-foreground">{H.transparentHint}</p>
          {h.transparent.enabled && (
            <>
              <Slider label={H.transparentOpacity} hint={H.transparentOpacityHint} value={h.transparent.opacity} min={0} max={90} step={10} unit="%" disabled={disabled} onChange={(v) => setTransparent({ opacity: v })} />
              <Toggle label={H.transparentBlur} checked={h.transparent.blur} disabled={disabled} onChange={(v) => setTransparent({ blur: v })} />
              <OptionalColor label={H.transparentText} autoLabel={C.chooseColor} value={h.transparent.foreground} fallback="#FFFFFF" onChange={(v) => setTransparent({ foreground: v })} labels={L.colors} disabled={disabled} />
              {/* The logo for dark backgrounds (Theme & design → Brand) while see-through; the normal one after scrolling */}
              <Toggle label={H.transparentLogo} checked={h.transparent.logoOnDark} disabled={disabled} onChange={(v) => setTransparent({ logoOnDark: v })} />
              <p className="-mt-3 text-xs text-muted-foreground">{H.transparentLogoHint}</p>
              {/* Soft dark shade from the top of the picture, so white icons stay readable */}
              <Toggle label={H.transparentGradient} checked={h.transparent.gradient} disabled={disabled} onChange={(v) => setTransparent({ gradient: v })} />
            </>
          )}
        </div>
      </Group>

      {/* ===== Menu links ===== */}
      <Group title={H.groups.menu} hint={H.menuHint}>
        <Toggle label={H.links.home} checked={h.menu.home} disabled={disabled} onChange={(v) => setMenu({ home: v })} />
        <Toggle label={H.links.products} checked={h.menu.products} disabled={disabled} onChange={(v) => setMenu({ products: v })} />
        <Toggle label={H.links.categories} checked={h.menu.categories} disabled={disabled} onChange={(v) => setMenu({ categories: v })} />
        {/* "Categories": own name (e.g. "Shop") and a drop-down list of the categories */}
        {h.menu.categories && (
          <>
            <BiText label={H.dd.categoriesLabel} value={h.menu.categoriesLabel} max={40} names={L.brand} disabled={disabled} onChange={(categoriesLabel) => setMenu({ categoriesLabel })} />
            <Toggle label={H.dd.categoriesDropdown} checked={h.menu.categoriesDropdown} disabled={disabled} onChange={(v) => setMenu({ categoriesDropdown: v })} />
            {h.menu.categoriesDropdown && (
              <>
                {/* Which categories, in the order they are ticked. None ticked = all main categories */}
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-semibold text-[#4a443b]">{H.dd.whichCategories}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => {
                      const n = ddIds.indexOf(c.id);
                      const on = n >= 0;
                      return (
                        <label key={c.id} className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm", on ? "border-gold bg-accent font-semibold" : "border-input bg-card")}>
                          <input type="checkbox" className="accent-[var(--gold)]" disabled={disabled} checked={on} onChange={(e) => setMenu({ categoriesDropdownIds: e.target.checked ? [...ddIds, c.id] : ddIds.filter((x) => x !== c.id) })} />
                          {on && <span className="text-xs text-muted-foreground">{n + 1}.</span>}
                          {c.name}
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{H.dd.whichCategoriesHint}</span>
                </fieldset>
                <Toggle label={H.dd.shopAll} checked={h.menu.shopAll.show} disabled={disabled} onChange={(v) => setMenu({ shopAll: { ...h.menu.shopAll, show: v } })} />
                {h.menu.shopAll.show && <BiText label={H.dd.shopAllLabel} value={h.menu.shopAll.label} max={40} names={L.brand} disabled={disabled} onChange={(label) => setMenu({ shopAll: { ...h.menu.shopAll, label } })} />}
              </>
            )}
          </>
        )}
        <Toggle label={H.links.pages} checked={h.menu.pages} disabled={disabled} onChange={(v) => setMenu({ pages: v })} />
        {/* WHICH pages: automatic (as set in Site pages) or picked here one by one, in the client's own order */}
        {h.menu.pages && <MenuPagesPicker value={h.menu.pageSlugs} pages={pages} onChange={(pageSlugs) => setMenu({ pageSlugs })} labels={H.menuPages} disabled={disabled} />}
        {/* The pages together under one drop-down ("About ▾") */}
        {h.menu.pages && (
          <>
            <Toggle label={H.dd.pagesDropdown} checked={h.menu.pagesDropdown.enabled} disabled={disabled} onChange={(v) => setMenu({ pagesDropdown: { ...h.menu.pagesDropdown, enabled: v } })} />
            {h.menu.pagesDropdown.enabled && <BiText label={H.dd.pagesLabel} value={h.menu.pagesDropdown.label} max={40} names={L.brand} disabled={disabled} onChange={(label) => setMenu({ pagesDropdown: { ...h.menu.pagesDropdown, label } })} />}
          </>
        )}
        <LinksEditor label={C.extraLinks} value={h.menu.extra} onChange={(extra) => setMenu({ extra, order: h.menu.order.filter((k) => !k.startsWith("link:")) })} labels={{ ...C.links, arabic: L.brand.arabic, english: L.brand.english }} disabled={disabled} />
        {/* ARRANGEMENT: every link that shows, moved up / down into the client's order */}
        <MenuOrder
          items={[
            ...(h.menu.home ? [{ key: "home", name: H.links.home }] : []),
            ...(h.menu.products ? [{ key: "products", name: H.links.products }] : []),
            ...(h.menu.categories ? [{ key: "categories", name: H.links.categories }] : []),
            ...(h.menu.pages ? (h.menu.pageSlugs ? h.menu.pageSlugs.map((slug) => pages.find((p) => p.slug === slug)).filter((p): p is MenuPageChoice => !!p) : pages.filter((p) => p.inHeader && p.live)).map((p) => ({ key: `page:${p.slug}`, name: p.name })) : []),
            ...h.menu.extra.map((l, i) => ({ key: `link:${i}`, name: l.label[locale] || l.label.ar || l.label.en })).filter((l) => l.name),
          ]}
          order={h.menu.order}
          onChange={(order) => setMenu({ order })}
          labels={H.menuOrder}
          disabled={disabled}
        />
      </Group>

      {/* ===== Drop-down look ===== (the lists under "Shop ▾" / "About ▾") */}
      {(h.menu.categoriesDropdown || h.menu.pagesDropdown.enabled) && (
        <Group title={H.dd.lookTitle} hint={H.dd.lookHint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <OptionalColor label={C.background} autoLabel={C.chooseColor} value={h.dropdown.background} fallback={theme.colors.background} onChange={(v) => setDd({ background: v })} labels={L.colors} disabled={disabled} />
            <OptionalColor label={C.textColor} autoLabel={C.chooseColor} value={h.dropdown.foreground} fallback={theme.colors.headerForeground} against={h.dropdown.background || theme.colors.background} onChange={(v) => setDd({ foreground: v })} labels={L.colors} disabled={disabled} />
          </div>
          <Choice label={H.dd.textSize} value={h.dropdown.textSize} disabled={disabled} options={sizes} onChange={(v) => setDd({ textSize: v })} />
          <Choice label={H.dd.spacing} value={h.dropdown.spacing} disabled={disabled} options={(["compact", "normal", "roomy"] as const).map((v) => ({ value: v, label: H.dd.spacings[v] }))} onChange={(v) => setDd({ spacing: v })} />
          <Toggle label={H.dd.border} checked={h.dropdown.border} disabled={disabled} onChange={(v) => setDd({ border: v })} />
          <Toggle label={H.dd.shadow} checked={h.dropdown.shadow} disabled={disabled} onChange={(v) => setDd({ shadow: v })} />
        </Group>
      )}

      {/* ===== Menu style ===== */}
      <Group title={H.groups.menuStyle}>
        <Choice label={H.menuSize} value={h.menuSize} disabled={disabled} options={sizes} onChange={(v) => set({ menuSize: v })} />
        <Choice label={H.menuWeight} value={h.menuWeight} disabled={disabled} options={(["normal", "bold"] as const).map((v) => ({ value: v, label: H.weights[v] }))} onChange={(v) => set({ menuWeight: v })} />
        <Toggle label={H.menuUppercase} checked={h.menuUppercase} disabled={disabled} onChange={(v) => set({ menuUppercase: v })} />
        {/* The link of the page that is open now (e.g. "Products" while browsing products) */}
        <Choice label={H.activeStyle} value={h.activeStyle} disabled={disabled} options={ACTIVE_LINK_STYLES.map((v) => ({ value: v, label: H.activeStyles[v] }))} onChange={(v) => set({ activeStyle: v })} />
        <p className="-mt-2 text-xs text-muted-foreground">{H.activeHint}</p>
        {h.activeStyle !== "none" && h.activeStyle !== "bold" && (
          <>
            <OptionalColor label={H.activeColor} autoLabel={C.chooseColor} value={h.activeColor} fallback={theme.colors.primary} against={h.activeStyle === "pill" ? undefined : theme.colors.headerBackground} onChange={(v) => set({ activeColor: v })} labels={L.colors} disabled={disabled} />
            {h.activeColor === "" && <p className="-mt-2 text-xs text-muted-foreground">{H.activeAuto}</p>}
            {/* Filled shape only: the colour of the words on it */}
            {h.activeStyle === "pill" && (
              <>
                <OptionalColor label={H.activeTextColor} autoLabel={C.chooseColor} value={h.activeTextColor} fallback="#FFFFFF" against={h.activeColor || h.hoverColor || theme.colors.headerForeground} onChange={(v) => set({ activeTextColor: v })} labels={L.colors} disabled={disabled} />
                {h.activeTextColor === "" && <p className="-mt-2 text-xs text-muted-foreground">{H.activeTextAuto}</p>}
              </>
            )}
          </>
        )}
      </Group>

      {/* ===== Icons ===== */}
      <Group title={H.groups.icons}>
        <Toggle label={H.icons.search} checked={h.icons.search} disabled={disabled} onChange={(v) => setIcons({ search: v })} />
        <Toggle label={H.icons.account} checked={h.icons.account} disabled={disabled} onChange={(v) => setIcons({ account: v })} />
        <Toggle label={H.icons.cart} checked={h.icons.cart} disabled={disabled} onChange={(v) => setIcons({ cart: v })} />
        <Toggle label={H.icons.language} checked={h.icons.language} disabled={disabled} onChange={(v) => setIcons({ language: v })} />
        <Choice label={H.iconSize} value={h.icons.size} disabled={disabled} options={sizes} onChange={(v) => setIcons({ size: v })} />
        {/* Pictures, or words ("Search · Log in · Cart (2)") on computers */}
        <Choice label={H.dd.iconDisplay} value={h.icons.display} disabled={disabled} options={(["icons", "text"] as const).map((v) => ({ value: v, label: H.dd.iconDisplays[v] }))} onChange={(v) => setIcons({ display: v })} />

        {/* Icon library: a ready-made set in one click, or choose each icon */}
        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[#4a443b]">{H.iconThemes}</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ICON_THEMES) as (keyof typeof ICON_THEMES)[]).map((k) => {
                const t = ICON_THEMES[k];
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIcons({ set: { search: t.search, account: t.account, cart: t.cart, menu: t.menu, language: t.language } })}
                    className="h-11 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
                  >
                    {H.iconThemeNames[k]}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">{H.iconThemesHint}</span>
          </div>
          <IconPicker label={H.icons.search} slot="search" value={h.icons.set.search} disabled={disabled} onChange={(id) => setIcon("search", id)} />
          <IconPicker label={H.icons.account} slot="account" value={h.icons.set.account} disabled={disabled} onChange={(id) => setIcon("account", id)} />
          <IconPicker label={H.icons.cart} slot="cart" value={h.icons.set.cart} disabled={disabled} onChange={(id) => setIcon("cart", id)} />
          <IconPicker label={H.icons.language} slot="language" value={h.icons.set.language} disabled={disabled} textLabel={locale === "ar" ? "EN" : "ع"} onChange={(id) => setIcon("language", id)} />
          <IconPicker label={H.menuIcon} slot="menu" value={h.icons.set.menu} disabled={disabled} onChange={(id) => setIcon("menu", id)} />
        </div>
      </Group>

      {/* ===== Search bar ===== (the bar that opens under the header; website: components/layout/HeaderSearch.tsx) */}
      {h.icons.search && (
        <div className="xl:col-span-2">
          <Group title={S.title} hint={S.hint}>
            {/* Ready-made looks in one click */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-[#4a443b]">{S.presets}</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SEARCH_PRESETS) as (keyof typeof SEARCH_PRESETS)[]).map((k) => (
                  <button key={k} type="button" disabled={disabled} onClick={() => setSearch(SEARCH_PRESETS[k])} className="h-11 rounded-lg border border-input bg-card px-4 text-sm font-medium hover:bg-muted disabled:opacity-60">
                    {S.presetNames[k]}
                  </button>
                ))}
              </div>
            </div>

            {/* Small sketch with the site colours */}
            <SearchSketch sb={sb} colors={theme.colors} words={sb.placeholder[locale] || S.defaultWords} button={sb.buttonText[locale]} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Choice label={S.look} value={sb.look} disabled={disabled} options={(["simple", "boxed"] as const).map((v) => ({ value: v, label: S.looks[v] }))} onChange={(v) => setSearch({ look: v })} />
              <Choice label={S.width} value={sb.width} disabled={disabled} options={(["narrow", "full"] as const).map((v) => ({ value: v, label: S.widths[v] }))} onChange={(v) => setSearch({ width: v })} />
            </div>
            <BiText label={S.words} value={sb.placeholder} max={60} names={L.brand} disabled={disabled} onChange={(placeholder) => setSearch({ placeholder })} />
            <p className="-mt-2 text-xs text-muted-foreground">{S.wordsHint}</p>
            <Toggle label={S.floatingLabel} checked={sb.floatingLabel} disabled={disabled} onChange={(v) => setSearch({ floatingLabel: v })} />
            {sb.look === "boxed" && (
              <>
                <BiText label={S.buttonText} value={sb.buttonText} max={30} names={L.brand} disabled={disabled} onChange={(buttonText) => setSearch({ buttonText })} />
                <p className="-mt-2 text-xs text-muted-foreground">{S.buttonTextHint}</p>
                <Choice label={S.buttonTextOn} value={sb.buttonTextOn} disabled={disabled} options={(["always", "hover"] as const).map((v) => ({ value: v, label: S.textOn[v] }))} onChange={(v) => setSearch({ buttonTextOn: v })} />
                <Toggle label={S.closeButton} checked={sb.closeButton} disabled={disabled} onChange={(v) => setSearch({ closeButton: v })} />
                <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                  <OptionalColor label={S.fieldBackground} autoLabel={C.chooseColor} value={sb.fieldBackground} fallback={theme.colors.background} onChange={(v) => setSearch({ fieldBackground: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.fieldBorder} autoLabel={C.chooseColor} value={sb.fieldBorder} fallback={theme.colors.primary} onChange={(v) => setSearch({ fieldBorder: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.labelColor} autoLabel={C.chooseColor} value={sb.labelColor} fallback={theme.colors.primary} onChange={(v) => setSearch({ labelColor: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.buttonColor} autoLabel={C.chooseColor} value={sb.buttonColor} fallback={theme.colors.primary} onChange={(v) => setSearch({ buttonColor: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.buttonTextColor} autoLabel={C.chooseColor} value={sb.buttonTextColor} fallback={theme.colors.primaryForeground} against={sb.buttonColor || theme.colors.primary} onChange={(v) => setSearch({ buttonTextColor: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.buttonHoverColor} autoLabel={C.chooseColor} value={sb.buttonHoverColor} fallback={theme.colors.accent} onChange={(v) => setSearch({ buttonHoverColor: v })} labels={L.colors} disabled={disabled} />
                  <OptionalColor label={S.buttonHoverTextColor} autoLabel={C.chooseColor} value={sb.buttonHoverTextColor} fallback={theme.colors.primary} against={sb.buttonHoverColor || theme.colors.accent} onChange={(v) => setSearch({ buttonHoverTextColor: v })} labels={L.colors} disabled={disabled} />
                  {sb.closeButton && <OptionalColor label={S.closeColor} autoLabel={C.chooseColor} value={sb.closeColor} fallback={theme.colors.primary} onChange={(v) => setSearch({ closeColor: v })} labels={L.colors} disabled={disabled} />}
                </div>
                <p className="text-xs text-muted-foreground">{S.autoHint}</p>
              </>
            )}
          </Group>
        </div>
      )}

      {/* ===== Announcement strip ===== */}
      <div className="xl:col-span-2">
        <Group title={H.groups.announcement} hint={H.announcementHint}>
          <Toggle label={H.announcementOn} checked={h.announcement.enabled} disabled={disabled} onChange={(v) => setAnn({ enabled: v })} />
          {h.announcement.enabled && (
            <>
              <BiText label={H.announcementText} value={h.announcement.text} max={200} names={L.brand} disabled={disabled} onChange={(text) => setAnn({ text })} />
              <Choice label={H.dd.announcementAlign} value={h.announcement.align} disabled={disabled} options={aligns} onChange={(v) => setAnn({ align: v })} />
              <Toggle label={H.dd.phoneIcon} checked={h.announcement.phoneIcon} disabled={disabled} onChange={(v) => setAnn({ phoneIcon: v })} />
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#4a443b]">
                {H.announcementLink}
                <input
                  dir="ltr"
                  maxLength={300}
                  placeholder="/products"
                  value={h.announcement.href}
                  disabled={disabled}
                  onChange={(e) => setAnn({ href: e.target.value.trim() })}
                  className="h-11 rounded-lg border border-input bg-card px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <OptionalColor label={C.background} autoLabel={C.chooseColor} value={h.announcement.background} fallback={theme.colors.primary} onChange={(v) => setAnn({ background: v })} labels={L.colors} disabled={disabled} />
                <OptionalColor
                  label={C.textColor}
                  autoLabel={C.chooseColor}
                  value={h.announcement.foreground}
                  fallback={theme.colors.primaryForeground}
                  against={h.announcement.background || theme.colors.primary}
                  onChange={(v) => setAnn({ foreground: v })}
                  labels={L.colors}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}

/**
 * WHICH PAGES SHOW IN THE TOP MENU
 *   "Automatic"          -> the pages whose "Show in" is "Top menu" in Site pages (saved as null)
 *   "Only the ones I choose" -> a list: add any page or remove it (saved as the list of page slugs).
 *                               The order of ALL menu links is set in <MenuOrder> below.
 */
function MenuPagesPicker({ value, pages, onChange, labels: M, disabled }: { value: string[] | null; pages: MenuPageChoice[]; onChange: (v: string[] | null) => void; labels: Labels; disabled?: boolean }) {
  const chosen = (value ?? []).filter((slug) => pages.some((p) => p.slug === slug));
  const rest = pages.filter((p) => !chosen.includes(p.slug));
  const auto = pages.filter((p) => p.inHeader && p.live);
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <Choice
        label={M.title}
        value={value === null ? "auto" : "chosen"}
        disabled={disabled}
        onChange={(v) => onChange(v === "auto" ? null : auto.map((p) => p.slug))}
        options={[
          { value: "auto", label: M.auto },
          { value: "chosen", label: M.chosen },
        ]}
      />
      {value === null ? (
        <p className="text-xs text-muted-foreground">
          {M.autoHint} {auto.length ? auto.map((p) => p.name).join(" · ") : M.autoNone}
        </p>
      ) : (
        <>
          {chosen.length === 0 && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{M.none}</p>}
          <ul className="flex flex-col gap-2">
            {chosen.map((slug) => {
              const page = pages.find((p) => p.slug === slug)!;
              return (
                <li key={slug} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {page.name}
                    {!page.live && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{M.notLive}</span>}
                  </span>
                  <button type="button" disabled={disabled} onClick={() => onChange(chosen.filter((x) => x !== slug))} aria-label={`${M.remove}: ${page.name}`} className={cn(iconButton, "text-destructive")}>
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          {rest.length > 0 && chosen.length < MAX_MENU_PAGES && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{M.add}</span>
              <div className="flex flex-wrap gap-2">
                {rest.map((p) => (
                  <button key={p.slug} type="button" disabled={disabled} onClick={() => onChange([...chosen, p.slug])} className={cn("inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-gold px-3 text-sm hover:bg-accent disabled:opacity-60", !p.live && "opacity-60")}>
                    <Plus className="size-3.5 text-gold" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{M.chosenHint}</p>
        </>
      )}
    </div>
  );
}

/**
 * ARRANGEMENT OF THE MENU — every link that shows (Home, Products, Categories, the pages, the extra links),
 * in the order it appears on the website; the arrows move a link earlier / later.
 * Saved as the list of link keys (theme.header.menu.order); "Original order" empties it.
 */
function MenuOrder({ items, order, onChange, labels: M, disabled }: { items: { key: string; name: string }[]; order: string[]; onChange: (order: string[]) => void; labels: Labels; disabled?: boolean }) {
  const sorted = orderMenu(items, order);
  const move = (i: number, by: number) => {
    const keys = sorted.map((x) => x.key);
    const [k] = keys.splice(i, 1);
    keys.splice(i + by, 0, k);
    onChange(keys);
  };
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";
  if (sorted.length < 2) return null;
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-semibold">{M.title}</legend>
      <p className="text-xs text-muted-foreground">{M.hint}</p>
      <ol className="flex flex-col gap-1.5">
        {sorted.map((item, i) => (
          <li key={item.key} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1">
            <span className="w-5 text-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.name}</span>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${M.earlier}: ${item.name}`} title={M.earlier} className={iconButton}>
              <ArrowUp className="size-4" />
            </button>
            <button type="button" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} aria-label={`${M.later}: ${item.name}`} title={M.later} className={iconButton}>
              <ArrowDown className="size-4" />
            </button>
          </li>
        ))}
      </ol>
      {order.length > 0 && (
        <button type="button" onClick={() => onChange([])} className="self-start rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
          {M.reset}
        </button>
      )}
    </fieldset>
  );
}

/** Sketch of the search bar with the site colours (the button shows its hover look on the right half) */
function SearchSketch({ sb, colors, words, button }: { sb: ThemeHeader["search"]; colors: SiteTheme["colors"]; words: string; button: string }) {
  if (sb.look === "simple")
    return (
      <div className="rounded-lg border p-3" style={{ background: colors.background }}>
        <div className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm" style={{ color: colors.mutedForeground }}>
          🔍 {words}
        </div>
      </div>
    );
  const btn = sb.buttonColor || colors.primary;
  const hover = sb.buttonHoverColor || colors.accent;
  return (
    <div className="flex items-stretch gap-2 rounded-lg border p-3" style={{ background: colors.background }}>
      <div className="relative h-12 min-w-0 flex-1 border" style={{ background: sb.fieldBackground || colors.background, borderColor: sb.fieldBorder || colors.primary }}>
        <span className={cn("absolute start-3 text-xs", sb.floatingLabel ? "top-1" : "top-1/2 -translate-y-1/2")} style={{ color: sb.floatingLabel ? sb.labelColor || colors.primary : colors.mutedForeground }}>
          {words}
        </span>
      </div>
      <span className="flex items-center justify-center gap-1 px-3 text-xs" style={{ background: btn, color: sb.buttonTextColor || colors.primaryForeground }}>
        🔍{sb.buttonTextOn === "always" && button && <span>{button}</span>}
      </span>
      {button && sb.buttonTextOn === "hover" && (
        <span className="flex items-center justify-center gap-1 px-3 text-xs" style={{ background: hover, color: sb.buttonHoverTextColor || colors.primary }} title="hover">
          🔍 {button}
        </span>
      )}
      {sb.closeButton && (
        <span className="flex w-10 items-center justify-center text-white" style={{ background: sb.closeColor || colors.primary }}>
          ✕
        </span>
      )}
    </div>
  );
}
