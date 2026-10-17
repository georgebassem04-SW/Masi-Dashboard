/**
 * HEADER / FOOTER LIVE PREVIEW — a small drawing of the website's top bar or footer that follows every option
 * while editing (pages /header and /footer). It uses ONLY the theme values, like the real website
 * (storefront/components/layout/Header.tsx + Footer.tsx). Sample texts: dictionaries → "theme.chrome.sample".
 * It is a sketch, not the real page: use "Open website" after publishing to see the real thing.
 */
"use client";

import { orderMenu, pillTextColor } from "@/lib/theme-chrome";

import { ArrowUp } from "lucide-react";
import { iconFor } from "@/lib/icon-library";
import type { FooterColumn, Locale, SiteTheme } from "@/types";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = any;

const SIZE_PX = { sm: 16, md: 20, lg: 24 } as const;
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;

export function ChromePreview({ menuPages, part, theme, locale, storefrontUrl, labels: L }: { /** The real pages of the top menu, for the header sketch (else sample names) */ menuPages?: { slug: string; name: string }[]; part: "header" | "footer"; theme: SiteTheme; locale: Locale; storefrontUrl: string; labels: Labels }) {
  const S = L.chrome.sample;
  const c = theme.colors;
  const brand = theme.brand;
  const src = (v: string) => (v.startsWith("/") ? `${storefrontUrl}${v}` : v);
  const wide = brand.logoShape === "wide";
  const name = brand.name[locale];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{L.chrome.preview}</span>
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="min-w-[860px]" style={{ background: c.background, color: c.foreground }}>
          {part === "header" ? headerSketch() : footerSketch()}
        </div>
      </div>
    </div>
  );

  function headerSketch() {
    const h = theme.header;
    const icon = SIZE_PX[h.icons.size];
    const SearchIcon = iconFor("search", h.icons.set.search)!;
    const AccountIcon = iconFor("account", h.icons.set.account)!;
    const CartIcon = iconFor("cart", h.icons.set.cart)!;
    const LanguageIcon = iconFor("language", h.icons.set.language);
    const tr = h.transparent;
    const nameHidden = h.showName === "hide" || (h.showName === "auto" && wide);
    const logoH = { sm: 28, md: 38, lg: 52 }[h.logoSize];
    const line = `1px solid color-mix(in srgb, ${c.headerForeground} 18%, transparent)`;
    // Same keys and same ordering rule as the website (lib/theme-chrome.ts → orderMenu)
    const links = orderMenu(
      [
        ...(h.menu.home ? [{ key: "home", name: S.home }] : []),
        ...(h.menu.products ? [{ key: "products", name: S.products }] : []),
        // Own name ("Shop") and "▾" when it opens a drop-down
        ...(h.menu.categories ? [{ key: "categories", name: `${h.menu.categoriesLabel[locale] || S.categories}${h.menu.categoriesDropdown ? " ▾" : ""}` }] : []),
        ...(() => {
          if (!h.menu.pages) return [];
          const pages = menuPages?.map((m) => ({ key: `page:${m.slug}`, name: m.name })) ?? [{ key: "page:about", name: S.about }, { key: "page:contact", name: S.contact }];
          // Pages under one drop-down: one entry in the place of the first page
          const group = h.menu.pagesDropdown.enabled && h.menu.pagesDropdown.label[locale];
          return group && pages.length ? [{ key: pages[0].key, name: `${group} ▾` }] : pages;
        })(),
        ...h.menu.extra.map((l, i) => ({ key: `link:${i}`, name: l.label[locale] })).filter((l) => l.name),
      ],
      h.menu.order,
    ).map((l) => l.name);
    const activeColor = h.activeColor || h.hoverColor || theme.colors.headerForeground;
    const activeLook: React.CSSProperties | undefined = {
      none: undefined,
      color: { color: activeColor },
      underline: { color: activeColor, textDecoration: "underline", textDecorationThickness: 2, textUnderlineOffset: 8 },
      bold: { fontWeight: 700 },
      pill: { background: activeColor, color: pillTextColor(h.activeTextColor, h.activeColor || h.hoverColor, theme.colors.headerBackground), borderRadius: 999, padding: "4px 14px" },
    }[h.activeStyle];
    const menu = (
      <ul
        className={cn("flex items-center gap-7", h.menuUppercase && "uppercase tracking-wide")}
        style={{ fontSize: { sm: 13, md: 15, lg: 17 }[h.menuSize], fontWeight: h.menuWeight === "bold" ? 600 : 400 }}
      >
        {links.map((l, i) => (
          // The 2nd link plays "the page that is open now" so the chosen look can be seen
          <li key={i} className="whitespace-nowrap" style={i === 1 ? activeLook : i === 0 && h.hoverColor ? { color: h.hoverColor } : undefined}>
            {l}
          </li>
        ))}
      </ul>
    );
    const logo = (
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {brand.logo && <img src={src(brand.logo)} alt="" style={{ height: logoH, width: wide ? "auto" : logoH, maxWidth: wide ? logoH * 3.2 : undefined }} className="object-contain" />}
        {!nameHidden && <span style={{ fontSize: { sm: 17, md: 20, lg: 24 }[h.logoSize] }} className="font-bold whitespace-nowrap">{name}</span>}
      </div>
    );
    // "Show as words": Search · Log in · Cart (0)
    const icons =
      h.icons.display === "text" ? (
        <div className="flex items-center gap-4 text-sm">
          {h.icons.search && <span>{L.header.words.search}</span>}
          {h.icons.account && <span>{L.header.words.login}</span>}
          {h.icons.cart && <span>{L.header.words.cart} (0)</span>}
        </div>
      ) : (
      <div className="flex items-center gap-4">
        {h.icons.search && <SearchIcon style={{ width: icon, height: icon }} />}
        {h.icons.language && (LanguageIcon ? <LanguageIcon style={{ width: icon, height: icon }} /> : <span className="text-sm">{locale === "ar" ? "English" : "العربية"}</span>)}
        {h.icons.account && <AccountIcon style={{ width: icon, height: icon }} />}
        {h.icons.cart && <CartIcon style={{ width: icon, height: icon }} />}
      </div>
      );
    const a = h.announcement;

    /* ----- FREE POSITIONS sketch: the same rows and areas as the website (storefront Header.tsx) ----- */
    const b = h.builder;
    if (b.enabled) {
      const word = h.icons.display === "text";
      const one = (k: "search" | "account" | "cart" | "language") => {
        const Icon = { search: SearchIcon, account: AccountIcon, cart: CartIcon, language: LanguageIcon }[k];
        if (word && k !== "language") return <span className="text-sm">{k === "cart" ? `${L.header.words.cart} (0)` : L.header.words[k === "account" ? "login" : k]}</span>;
        return Icon ? <Icon style={{ width: icon, height: icon }} /> : <span className="text-sm">{locale === "ar" ? "English" : "العربية"}</span>;
      };
      const node: Record<string, React.ReactNode> = {
        logo,
        menu,
        search: h.icons.search ? one("search") : null,
        language: h.icons.language ? one("language") : null,
        account: h.icons.account ? one("account") : null,
        cart: h.icons.cart ? one("cart") : null,
        text: a.text[locale] ? <span className="text-sm">{a.phoneIcon && "☎ "}{a.text[locale]}</span> : null,
      };
      const rows = (["top", "main", "bottom"] as const).filter((r) => b.items.some((i) => i.show && i.row === r && node[i.part]));
      return (
        <div className="relative">
          {tr.enabled && <div className="absolute inset-x-0 top-0 h-44" style={{ background: "linear-gradient(120deg, #6b5b45 0%, #b89b6a 45%, #3d3428 100%)" }} />}
          <div
            style={
              tr.enabled
                ? { background: `color-mix(in srgb, ${c.headerBackground} ${tr.opacity}%, transparent)`, color: tr.foreground || c.headerForeground, position: "relative" }
                : { background: c.headerBackground, color: c.headerForeground, borderBottom: h.border ? line : undefined, boxShadow: h.shadow ? "0 4px 10px rgb(0 0 0 / 0.18)" : undefined, position: "relative" }
            }
          >
            {rows.map((r, n) => (
              <div
                key={r}
                style={{
                  background: r === "top" ? a.background || undefined : undefined,
                  color: r === "top" ? a.foreground || undefined : undefined,
                  borderTop: n > 0 && b.rowLines ? line : undefined,
                }}
              >
                <div className="mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4" style={{ height: r === "main" ? { compact: 56, normal: 72, tall: 92 }[h.height] : r === "top" ? (b.topHeight === "compact" ? 32 : 40) : b.bottomHeight === "compact" ? 38 : 46, maxWidth: h.width === "full" ? undefined : 760, paddingInline: 24 }}>
                  {(["start", "center", "end"] as const).map((z) => (
                    <div key={z} className={cn("flex min-w-0 items-center gap-4", { start: "justify-start", center: "justify-center", end: "justify-end" }[z])}>
                      {b.items.filter((i) => i.show && i.row === r && i.zone === z && node[i.part]).map((i) => (
                        <div key={i.part}>{node[i.part]}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={tr.enabled ? "relative flex h-24 items-center justify-center text-sm font-semibold text-white/90" : "h-10"}>{tr.enabled && S.picture}</div>
        </div>
      );
    }

    return (
      <>
        {a.enabled && a.text[locale] && (
          <div className={cn("px-4 py-1.5 text-sm font-medium", { start: "text-start", center: "text-center", end: "text-end" }[a.align])} style={{ background: a.background || c.primary, color: a.foreground || c.primaryForeground }}>
            {a.phoneIcon && "☎ "}
            {a.text[locale]}
          </div>
        )}
        {/* See-through: the header sits on top of a sample "picture" (like the homepage slider) */}
        <div className="relative">
        {tr.enabled && <div className="absolute inset-x-0 top-0 h-44" style={{ background: "linear-gradient(120deg, #6b5b45 0%, #b89b6a 45%, #3d3428 100%)" }} />}
        <div
          style={
            tr.enabled
              ? { background: `color-mix(in srgb, ${c.headerBackground} ${tr.opacity}%, transparent)`, color: tr.foreground || c.headerForeground, backdropFilter: tr.blur ? "blur(6px)" : undefined, position: "relative" }
              : { background: c.headerBackground, color: c.headerForeground, borderBottom: h.border ? line : undefined, boxShadow: h.shadow ? "0 4px 10px rgb(0 0 0 / 0.18)" : undefined, position: "relative" }
          }
        >
          <div
            className={cn("mx-auto flex items-center gap-6", h.layout === "logo-center" && "grid grid-cols-[1fr_auto_1fr]")}
            style={{ height: { compact: 56, normal: 72, tall: 92 }[h.height], maxWidth: h.width === "full" ? undefined : 760, paddingInline: 24 }}
          >
            {h.layout === "logo-center" ? (
              <>
                <div className="flex justify-start">{menu}</div>
                {logo}
                <div className="flex justify-end">{icons}</div>
              </>
            ) : (
              <>
                {logo}
                <div className={cn("flex flex-1", JUSTIFY[h.menuAlign])}>{h.layout === "logo-start" && menu}</div>
                {icons}
              </>
            )}
          </div>
          {h.layout === "stacked" && (
            <div style={{ borderTop: line }}>
              <div className={cn("mx-auto flex h-11 items-center", JUSTIFY[h.menuAlign])} style={{ maxWidth: h.width === "full" ? undefined : 760, paddingInline: 24 }}>
                {menu}
              </div>
            </div>
          )}
        </div>
        {/* A bit of "page" under the header so shadow / line (or the picture) are visible */}
        <div className={tr.enabled ? "relative flex h-24 items-center justify-center text-sm font-semibold text-white/90" : "h-10"}>{tr.enabled && S.picture}</div>
        </div>
      </>
    );
  }

  function footerSketch() {
    const f = theme.footer;
    const centered = f.layout === "centered";
    const center = centered || f.align === "center";
    const line = `1px solid color-mix(in srgb, ${c.footerForeground} 20%, transparent)`;
    const logoH = { sm: 28, md: 34, lg: 50 }[f.logoSize];
    const heading = (text: string) => (
      <p className="mb-2 text-base font-bold" style={{ color: f.headingColor || undefined }}>
        {text}
      </p>
    );
    const linkNames = [
      ...(f.links.home ? [S.home] : []),
      ...(f.links.products ? [S.products] : []),
      ...(f.links.contact ? [S.contact] : []),
      ...(f.links.pages ? [S.faq, S.terms] : []),
      ...f.links.extra.map((l) => l.label[locale]).filter(Boolean),
    ];
    const contactItems = (
      [
        { key: "phone", label: S.phone, value: "+20 100 000 0000" },
        { key: "whatsapp", label: S.whatsapp, value: "+20 100 000 0000" },
        { key: "email", label: S.email, value: "info@store.com" },
        { key: "address", label: "", value: S.address },
        { key: "hours", label: "", value: S.hours },
      ] as const
    ).filter((x) => f.contact[x.key]);
    const rowContact = f.contactDirection === "row" || f.contactDisplay === "icons";
    const contactAlign = centered ? "center" : f.contactAlign;
    const contactLines = (
      <div
        className={cn(
          "flex",
          rowContact ? "flex-row flex-wrap gap-x-4 gap-y-2" : "flex-col gap-1",
          rowContact ? { start: "justify-start", center: "justify-center", end: "justify-end" }[contactAlign] : { start: "items-start", center: "items-center", end: "items-end" }[contactAlign],
        )}
      >
        {contactItems.map((item) => {
          const Icon = iconFor(item.key, f.contactIcons[item.key])!;
          const box = (
            <span className={cn("flex shrink-0 items-center justify-center", f.contactIconStyle === "circle" ? "size-8 rounded-full" : "size-4")} style={f.contactIconStyle === "circle" ? { border: line } : undefined}>
              <Icon style={{ width: 14, height: 14 }} />
            </span>
          );
          return (
            <span key={item.key} className="inline-flex items-center gap-2">
              {f.contactDisplay !== "details" && box}
              {f.contactDisplay !== "icons" && <span>{f.contactDisplay === "details" && item.label ? `${item.label}: ${item.value}` : item.value}</span>}
            </span>
          );
        })}
      </div>
    );
    const socialRow = (
      <div className={cn("flex gap-2", (center || f.socialPlacement === "row") && "justify-center")}>
        {["in", "f", "tt"].map((s) => (
          <span
            key={s}
            className={cn("flex size-8 items-center justify-center text-xs font-bold", f.socialStyle === "circle" && "rounded-full")}
            style={f.socialStyle === "circle" ? { border: line } : f.socialStyle === "square" ? { background: `color-mix(in srgb, ${c.footerForeground} 10%, transparent)` } : undefined}
          >
            {s}
          </span>
        ))}
      </div>
    );
    const groupNodes = f.groups.map((g, i) => (
      <div key={`g${i}`}>
        {g.title[locale] && heading(g.title[locale])}
        <ul className="space-y-1">
          {g.links.filter((l) => l.label[locale]).map((l, j) => (
            <li key={j}>{l.label[locale]}</li>
          ))}
        </ul>
        {g.text[locale] && <p className="mt-1 whitespace-pre-line">{g.text[locale]}</p>}
      </div>
    ));
    const parts: Record<FooterColumn, React.ReactNode> = {
      about:
        f.showLogo || f.showName || f.showTagline ? (
          <div>
            <div className={cn("mb-2 flex items-center gap-2", center && "justify-center")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.showLogo && (brand.logoOnDark || brand.logo) && <img src={src(brand.logoOnDark || brand.logo)} alt="" style={{ height: logoH, width: wide ? "auto" : logoH, maxWidth: wide ? logoH * 3.2 : undefined }} className="object-contain" />}
              {f.showName && !(wide && f.showLogo) && (
                <span className="text-base font-bold" style={{ color: f.headingColor || undefined }}>
                  {name}
                </span>
              )}
            </div>
            {f.showTagline && <p>{brand.tagline[locale]}</p>}
            {f.contactUnderAbout && contactItems.length > 0 && <div className="mt-3">{contactLines}</div>}
          </div>
        ) : null,
      links: linkNames.length ? (
        <div>
          {heading(S.quickLinks)}
          <ul className={centered ? "flex flex-wrap justify-center gap-x-5 gap-y-1" : "space-y-1"}>
            {linkNames.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      ) : null,
      contact: contactItems.length && !f.contactUnderAbout ? (
        <div>
          {heading(S.contactTitle)}
          {contactLines}
        </div>
      ) : null,
      groups: null, // drawn below: one column per own column
      social:
        f.socialPlacement === "row" ? null : (
          <div>
            {heading(S.followUs)}
            {socialRow}
          </div>
        ),
    };
    const shown = f.columns
      .flatMap((k): { k: string; node: React.ReactNode }[] => (k === "groups" ? groupNodes.map((node, i) => ({ k: `group-${i}`, node })) : [{ k, node: parts[k] }]))
      .filter((x) => x.node);
    const maxWidth = f.width === "full" ? undefined : 760;
    const year = new Date().getFullYear();
    const copyright = f.bottom.text[locale] ? f.bottom.text[locale].replaceAll("{year}", String(year)).replaceAll("{store}", name) : `© ${year} ${name}`;

    return (
      <>
        <div className="h-8" />
        <div className="text-sm" style={{ background: f.transparent ? "transparent" : c.footerBackground, color: c.footerForeground, borderTop: f.borderTop ? line : undefined }}>
          {shown.length > 0 && (
            <div className="mx-auto" style={{ maxWidth, paddingInline: 24, paddingBlock: { compact: 18, normal: 28, spacious: 48 }[f.spacing] }}>
              <div className={cn(centered ? "flex flex-col items-center gap-6" : "grid gap-8", center && "text-center")} style={centered ? undefined : { gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
                {shown.map((x) => (
                  <div key={x.k}>{x.node}</div>
                ))}
              </div>
            </div>
          )}
          {f.socialPlacement === "row" && (
            <div className="py-4" style={{ borderTop: shown.length ? line : undefined }}>
              {socialRow}
            </div>
          )}
          {(f.bottom.show || f.backToTop) && (
            <div style={{ background: f.bottom.background || undefined, borderTop: shown.length || f.socialPlacement === "row" ? line : undefined }}>
              <div
                className={cn("mx-auto flex items-center gap-5 py-3 text-xs", f.bottom.align === "center" ? "justify-center" : f.bottom.align === "between" ? "justify-between" : "justify-start")}
                style={{ maxWidth, paddingInline: 24 }}
              >
                {f.bottom.show && <span>{copyright}</span>}
                {f.bottom.show && f.bottom.links.filter((l) => l.label[locale]).map((l, i) => <span key={i}>{l.label[locale]}</span>)}
                {f.bottom.show && f.bottom.poweredBy && <span className="opacity-80">{S.powered}</span>}
                {f.backToTop && (
                  <span className={cn("inline-flex items-center gap-1", f.bottom.align !== "center" && "ms-auto")}>
                    <ArrowUp className="size-3.5" />
                    {S.backToTop}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}
