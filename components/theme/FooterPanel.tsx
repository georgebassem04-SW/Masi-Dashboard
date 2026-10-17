/**
 * FOOTER EDITOR — every option of the website's footer (page /footer in the sidebar).
 * ------------------------------------------------------------------
 * Groups: Arrangement · Parts & order · Logo and name · Colours · Links · Contact details · Social icons · Last line
 * All values live in the theme (theme.footer + shared ones: colours, footer logo, tagline),
 * so "Save draft" / "Publish" in the toolbar work exactly like in Theme & design.
 *
 * Where to edit:
 *   - Options and their defaults  -> types/theme.ts (ThemeFooter) + lib/theme-chrome.ts
 *   - Texts                       -> dictionaries → "theme.footer" (and "theme.chrome" for shared words)
 *   - How the website uses them   -> storefront/components/layout/Footer.tsx
 * Phone, email, address, hours and social LINKS themselves: Settings → Store details.
 */
"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { FooterColumn, FooterGroup, Locale, SiteTheme, ThemeFooter } from "@/types";
import { FOOTER_COLUMNS, MAX_FOOTER_GROUPS, MAX_GROUP_LINKS } from "@/lib/theme-chrome";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import { cn } from "@/lib/utils";
import { Choice, ColorField, Toggle } from "./fields";
import { ImageField } from "./ImageField";
import { BiText, Group, IconPicker, LinksEditor, OptionalColor } from "./chrome-fields";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = any;

interface Props {
  theme: SiteTheme;
  setTheme: (fn: (t: SiteTheme) => SiteTheme) => void;
  labels: Labels;
  mediaLabels: MediaLabels;
  locale: Locale;
  storefrontUrl: string;
  disabled: boolean;
}

export function FooterPanel({ theme, setTheme, labels: L, mediaLabels, locale, storefrontUrl, disabled }: Props) {
  const f = theme.footer;
  const F = L.footer;
  const C = L.chrome;
  const set = (patch: Partial<ThemeFooter>) => setTheme((t) => ({ ...t, footer: { ...t.footer, ...patch } }));
  const setLinks = (patch: Partial<ThemeFooter["links"]>) => set({ links: { ...f.links, ...patch } });
  const setContact = (patch: Partial<ThemeFooter["contact"]>) => set({ contact: { ...f.contact, ...patch } });
  const setBottom = (patch: Partial<ThemeFooter["bottom"]>) => set({ bottom: { ...f.bottom, ...patch } });
  const setColor = (k: "footerBackground" | "footerForeground", v: string) => setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const sizes = (["sm", "md", "lg"] as const).map((v) => ({ value: v, label: C.sizes[v] }));

  // Parts: the shown ones first (in their order), then the hidden ones
  const hidden = FOOTER_COLUMNS.filter((c) => !f.columns.includes(c));
  const toggleColumn = (c: FooterColumn, on: boolean) => set({ columns: on ? [...f.columns, c] : f.columns.filter((x) => x !== c) });
  const moveColumn = (i: number, by: number) => {
    const next = [...f.columns];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    set({ columns: next });
  };
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      {/* ===== Arrangement ===== */}
      <Group title={F.groups.layout}>
        <Choice label={F.layout} value={f.layout} disabled={disabled} options={(["columns", "centered"] as const).map((v) => ({ value: v, label: F.layouts[v] }))} onChange={(v) => set({ layout: v })} />
        {f.layout === "columns" && <Choice label={F.align} value={f.align} disabled={disabled} options={(["start", "center"] as const).map((v) => ({ value: v, label: C.aligns[v] }))} onChange={(v) => set({ align: v })} />}
        <Choice label={F.spacing} value={f.spacing} disabled={disabled} options={(["compact", "normal", "spacious"] as const).map((v) => ({ value: v, label: F.spacings[v] }))} onChange={(v) => set({ spacing: v })} />
        <Choice label={C.width} value={f.width} disabled={disabled} options={(["boxed", "full"] as const).map((v) => ({ value: v, label: C.widths[v] }))} onChange={(v) => set({ width: v })} />
        <Toggle label={F.borderTop} checked={f.borderTop} disabled={disabled} onChange={(v) => set({ borderTop: v })} />
        <Choice label={F.x.headingSize} value={f.headingSize} disabled={disabled} options={sizes} onChange={(v) => set({ headingSize: v })} />
        {/* classic = heading font · caps = small spaced capitals ("INFORMATION") */}
        <Choice label={F.x.headingStyle} value={f.headingStyle} disabled={disabled} options={(["classic", "caps"] as const).map((v) => ({ value: v, label: F.x.headingStyles[v] }))} onChange={(v) => set({ headingStyle: v })} />
      </Group>

      {/* ===== Parts & order ===== */}
      <Group title={F.groups.parts} hint={F.partsHint}>
        <ul className="flex flex-col gap-2">
          {[...f.columns, ...hidden].map((c) => {
            const i = f.columns.indexOf(c);
            const on = i >= 0;
            return (
              <li key={c} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", !on && "bg-muted/60")}>
                <div className="min-w-0 flex-1">
                  <Toggle label={F.parts[c]} checked={on} disabled={disabled} onChange={(v) => toggleColumn(c, v)} />
                </div>
                <button type="button" disabled={disabled || !on || i === 0} onClick={() => moveColumn(i, -1)} aria-label={`${C.links.up}: ${F.parts[c]}`} className={iconButton}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" disabled={disabled || !on || i === f.columns.length - 1} onClick={() => moveColumn(i, 1)} aria-label={`${C.links.down}: ${F.parts[c]}`} className={iconButton}>
                  <ArrowDown className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </Group>

      {/* ===== Logo and name ===== (logo for dark backgrounds + tagline are the same as Theme & design → Brand) */}
      <Group title={F.groups.brand}>
        <Toggle label={F.showLogo} checked={f.showLogo} disabled={disabled} onChange={(v) => set({ showLogo: v })} />
        {f.showLogo && (
          <>
            <ImageField
              label={L.brand.logoOnDark}
              hint={L.brand.logoOnDarkHint}
              value={theme.brand.logoOnDark}
              onChange={(v) => setTheme((t) => ({ ...t, brand: { ...t.brand, logoOnDark: v } }))}
              storefrontUrl={storefrontUrl}
              labels={L.media}
              mediaLabels={mediaLabels}
              locale={locale}
              disabled={disabled}
              crop={{
                shape: theme.brand.logoShape ?? "square",
                canChangeShape: false,
                preview: { background: theme.colors.footerBackground, foreground: theme.colors.footerForeground, name: theme.brand.name[locale] },
                labels: L.cropper,
              }}
            />
            <Choice label={F.logoSize} value={f.logoSize} disabled={disabled} options={sizes} onChange={(v) => set({ logoSize: v })} />
          </>
        )}
        <Toggle label={F.showName} checked={f.showName} disabled={disabled} onChange={(v) => set({ showName: v })} />
        <Toggle label={F.showTagline} checked={f.showTagline} disabled={disabled} onChange={(v) => set({ showTagline: v })} />
        {/* The tagline text itself is part of the brand (also used by Google) → Theme & design → Brand */}
        {f.showTagline && (
          <p className="-mt-2 text-xs text-muted-foreground">
            {F.taglineHint}{" "}
            <Link href="/theme" className="font-semibold text-gold hover:underline">
              {F.taglineLink}
            </Link>
          </p>
        )}
      </Group>

      {/* ===== Colours ===== */}
      <Group title={F.groups.colors}>
        <Toggle label={F.transparent} checked={f.transparent} disabled={disabled} onChange={(v) => set({ transparent: v })} />
        <p className="-mt-3 text-xs text-muted-foreground">{F.transparentHint}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField label={L.colors.names.footerBackground} value={theme.colors.footerBackground} onChange={(v) => setColor("footerBackground", v)} labels={L.colors} disabled={disabled} />
          <ColorField label={L.colors.names.footerForeground} value={theme.colors.footerForeground} against={theme.colors.footerBackground} onChange={(v) => setColor("footerForeground", v)} labels={L.colors} disabled={disabled} />
        </div>
        <OptionalColor label={F.headingColor} autoLabel={C.chooseColor} value={f.headingColor} fallback={theme.colors.accent} against={theme.colors.footerBackground} onChange={(v) => set({ headingColor: v })} labels={L.colors} disabled={disabled} />
        <OptionalColor label={F.bottomBackground} autoLabel={C.chooseColor} value={f.bottom.background} fallback={theme.colors.footerBackground} onChange={(v) => setBottom({ background: v })} labels={L.colors} disabled={disabled} />
      </Group>

      {/* ===== Links ===== */}
      <Group title={F.groups.links} hint={F.linksHint}>
        <Toggle label={F.links.home} checked={f.links.home} disabled={disabled} onChange={(v) => setLinks({ home: v })} />
        <Toggle label={F.links.products} checked={f.links.products} disabled={disabled} onChange={(v) => setLinks({ products: v })} />
        <Toggle label={F.links.contact} checked={f.links.contact} disabled={disabled} onChange={(v) => setLinks({ contact: v })} />
        <Toggle label={F.links.pages} checked={f.links.pages} disabled={disabled} onChange={(v) => setLinks({ pages: v })} />
        <LinksEditor label={C.extraLinks} value={f.links.extra} onChange={(extra) => setLinks({ extra })} labels={{ ...C.links, arabic: L.brand.arabic, english: L.brand.english }} disabled={disabled} />
      </Group>

      {/* ===== Own columns ===== a title + links and / or a short text each ("Work together", "Working hours") */}
      <div className="xl:col-span-2">
        <Group title={F.x.groupsTitle} hint={F.x.groupsHint}>
          {f.groups.map((g, i) => {
            const update = (patch: Partial<FooterGroup>) => set({ groups: f.groups.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {F.x.column} {i + 1}
                  </span>
                  <button type="button" disabled={disabled} onClick={() => set({ groups: f.groups.filter((_, j) => j !== i) })} className="text-sm font-semibold text-destructive hover:underline disabled:opacity-40">
                    {F.x.removeColumn}
                  </button>
                </div>
                <BiText label={F.x.columnTitle} value={g.title} max={60} names={L.brand} disabled={disabled} onChange={(title) => update({ title })} />
                <LinksEditor label={F.x.columnLinks} value={g.links} max={MAX_GROUP_LINKS} onChange={(links) => update({ links })} labels={{ ...C.links, arabic: L.brand.arabic, english: L.brand.english }} disabled={disabled} />
                <BiText label={F.x.columnText} value={g.text} max={300} names={L.brand} disabled={disabled} onChange={(text) => update({ text })} />
              </div>
            );
          })}
          {f.groups.length < MAX_FOOTER_GROUPS && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => set({ groups: [...f.groups, { title: { ar: "", en: "" }, links: [], text: { ar: "", en: "" } }], columns: f.columns.includes("groups") ? f.columns : [...f.columns, "groups"] })}
              className="h-10 self-start rounded-lg border border-dashed px-4 text-sm font-semibold hover:bg-muted disabled:opacity-40"
            >
              + {F.x.addColumn}
            </button>
          )}
        </Group>
      </div>

      <div className="flex flex-col gap-5">
        {/* ===== Contact details ===== */}
        <Group title={F.groups.contact}>
          <p className="-mt-1 text-xs text-muted-foreground">
            {F.contactHint}{" "}
            <Link href="/settings/store" className="font-semibold text-gold hover:underline">
              {F.storeDetails}
            </Link>
          </p>
          {(["phone", "whatsapp", "email", "address", "hours"] as const).map((k) => (
            <Toggle key={k} label={F.contact[k]} checked={f.contact[k]} disabled={disabled} onChange={(v) => setContact({ [k]: v })} />
          ))}
          {/* Under the logo and tagline instead of their own column */}
          <Toggle label={F.x.contactUnderAbout} checked={f.contactUnderAbout} disabled={disabled} onChange={(v) => set({ contactUnderAbout: v })} />

          {/* How they show: text, icons only, or both — and where */}
          <div className="flex flex-col gap-4 border-t pt-4">
            <Choice label={F.contactDisplay} value={f.contactDisplay} disabled={disabled} options={(["details", "icons", "both"] as const).map((v) => ({ value: v, label: F.contactDisplays[v] }))} onChange={(v) => set({ contactDisplay: v })} />
            <p className="-mt-2 text-xs text-muted-foreground">{F.contactDisplayHints[f.contactDisplay]}</p>
            {f.contactDisplay !== "icons" && (
              <Choice label={F.contactDirection} value={f.contactDirection} disabled={disabled} options={(["column", "row"] as const).map((v) => ({ value: v, label: F.contactDirections[v] }))} onChange={(v) => set({ contactDirection: v })} />
            )}
            {f.layout === "columns" && <Choice label={F.contactAlign} value={f.contactAlign} disabled={disabled} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: C.aligns[v] }))} onChange={(v) => set({ contactAlign: v })} />}
            {f.contactDisplay !== "details" && (
              <>
                <Choice label={F.contactIconStyle} value={f.contactIconStyle} disabled={disabled} options={(["circle", "plain"] as const).map((v) => ({ value: v, label: F.socialStyles[v] }))} onChange={(v) => set({ contactIconStyle: v })} />
                {(["phone", "whatsapp", "email", "address", "hours"] as const)
                  .filter((k) => f.contact[k])
                  .map((k) => (
                    <IconPicker key={k} label={F.contact[k]} slot={k} value={f.contactIcons[k]} disabled={disabled} onChange={(id) => set({ contactIcons: { ...f.contactIcons, [k]: id } })} />
                  ))}
              </>
            )}
          </div>
        </Group>

        {/* ===== Social icons ===== */}
        <Group title={F.groups.social} hint={F.socialHint}>
          <Choice label={F.socialStyle} value={f.socialStyle} disabled={disabled} options={(["circle", "plain", "square"] as const).map((v) => ({ value: v, label: v === "square" ? F.x.square : F.socialStyles[v] }))} onChange={(v) => set({ socialStyle: v })} />
          {/* In their own column (Parts & order → Social), or a centred row above the last line */}
          <Choice label={F.x.socialPlacement} value={f.socialPlacement} disabled={disabled} options={(["column", "row", "top"] as const).map((v) => ({ value: v, label: F.x.socialPlacements[v] }))} onChange={(v) => set({ socialPlacement: v })} />
        </Group>

        {/* ===== Newsletter + divider picture (top of the footer) ===== */}
        <Group title={F.x.topTitle} hint={F.x.topHint}>
          <Toggle label={F.x.newsletter} checked={f.newsletter.show} disabled={disabled} onChange={(v) => set({ newsletter: { ...f.newsletter, show: v } })} />
          {f.newsletter.show && (
            <>
              <BiText label={F.x.newsletterPlaceholder} value={f.newsletter.placeholder} max={60} names={L.brand} disabled={disabled} onChange={(placeholder) => set({ newsletter: { ...f.newsletter, placeholder } })} />
              <BiText label={F.x.newsletterButton} value={f.newsletter.button} max={30} names={L.brand} disabled={disabled} onChange={(button) => set({ newsletter: { ...f.newsletter, button } })} />
              <BiText label={F.x.newsletterThanks} value={f.newsletter.thanks} max={120} names={L.brand} disabled={disabled} onChange={(thanks) => set({ newsletter: { ...f.newsletter, thanks } })} />
              <p className="-mt-2 text-xs text-muted-foreground">{F.x.newsletterHint}</p>
            </>
          )}
          <ImageField
            frame="footerDivider"
            label={F.x.divider}
            hint={F.x.dividerHint}
            value={f.divider}
            onChange={(v) => set({ divider: v })}
            storefrontUrl={storefrontUrl}
            labels={L.media}
            mediaLabels={mediaLabels}
            locale={locale}
            disabled={disabled}
          />
        </Group>
      </div>

      {/* ===== Last line ===== */}
      <div className="xl:col-span-2">
        <Group title={F.groups.bottom}>
          <Toggle label={F.bottomShow} checked={f.bottom.show} disabled={disabled} onChange={(v) => setBottom({ show: v })} />
          {f.bottom.show && (
            <>
              <BiText label={F.bottomText} value={f.bottom.text} max={200} names={L.brand} disabled={disabled} onChange={(text) => setBottom({ text })} />
              <p className="-mt-2 text-xs text-muted-foreground">{F.bottomTextHint}</p>
              <LinksEditor label={F.x.bottomLinks} value={f.bottom.links} onChange={(links) => setBottom({ links })} labels={{ ...C.links, arabic: L.brand.arabic, english: L.brand.english }} disabled={disabled} />
              <Toggle label={F.poweredBy} checked={f.bottom.poweredBy} disabled={disabled} onChange={(v) => setBottom({ poweredBy: v })} />
              <Choice label={F.bottomAlign} value={f.bottom.align} disabled={disabled} options={(["start", "center", "between"] as const).map((v) => ({ value: v, label: F.bottomAligns[v] }))} onChange={(v) => setBottom({ align: v })} />
              <OptionalColor label={F.x.bottomText} autoLabel={C.chooseColor} value={f.bottom.foreground} fallback={theme.colors.footerForeground} against={f.bottom.background || theme.colors.footerBackground} onChange={(v) => setBottom({ foreground: v })} labels={L.colors} disabled={disabled} />
              {/* Three parts: copyright · small oval mark · own words at the end */}
              <Toggle label={F.x.bottomMark} checked={f.bottom.mark} disabled={disabled} onChange={(v) => setBottom({ mark: v })} />
              <BiText label={F.x.bottomEnd} value={f.bottom.endText} max={80} names={L.brand} disabled={disabled} onChange={(endText) => setBottom({ endText })} />
              <p className="-mt-2 text-xs text-muted-foreground">{F.x.bottomEndHint}</p>
            </>
          )}
          <Toggle label={F.backToTop} checked={f.backToTop} disabled={disabled} onChange={(v) => set({ backToTop: v })} />
        </Group>
      </div>
    </div>
  );
}
