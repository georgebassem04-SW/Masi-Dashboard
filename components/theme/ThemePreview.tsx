/**
 * LIVE PREVIEW — a small model of the storefront drawn with the theme being edited:
 * top bar (logo, name, menu), banner, product cards, button, footer.
 * It updates instantly as the designer changes anything. Fonts are loaded from Google Fonts
 * only for this preview (the real website loads them itself).
 * Texts come from the website texts (with the designer's changes applied).
 */
"use client";

import { useEffect, useState } from "react";
import type { Locale, SiteTheme } from "@/types";
import { ARABIC_FONT_OPTIONS, LATIN_FONT_OPTIONS, type FontOption } from "@/config/theme-defaults";
import { cn } from "@/lib/utils";
import arTexts from "@/config/storefront-texts/ar.json";
import enTexts from "@/config/storefront-texts/en.json";

const DEFAULT_TEXTS = { ar: arTexts, en: enTexts } as const;

function textFor(theme: SiteTheme, locale: Locale, key: string): string {
  const override = theme.texts[locale][key];
  if (override) return override;
  const value = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), DEFAULT_TEXTS[locale]);
  return typeof value === "string" ? value : key;
}

/**
 * Loads the chosen fonts into the dashboard page so the preview can show them: one <link> per family
 * (asking only for the weights that family really has — config/theme-defaults.ts — so one font can't break the others).
 */
function useGoogleFonts(fonts: FontOption[]) {
  // A client's own font (option.css) loads the dashboard's own stylesheet instead of Google Fonts
  const key = Array.from(new Set(fonts.map((f) => (f.css ? `css:${f.css}` : `${f.google}:${f.weights}`))))
    .sort()
    .join("|");
  useEffect(() => {
    for (const item of key.split("|")) {
      const own = item.startsWith("css:");
      const [family, weights] = own ? [item.slice(4), ""] : item.split(":");
      const id = `theme-font-${family.replace(/[^a-z0-9]+/gi, "-")}`;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = own ? family : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weights}&display=swap`;
      document.head.appendChild(link);
    }
  }, [key]);
}

export function ThemePreview({
  theme,
  storefrontUrl,
  labels,
}: {
  theme: SiteTheme;
  storefrontUrl: string;
  labels: { title: string; hint: string; language: string; heroTitle: string; heroText: string; section: string; product: string };
}) {
  const [locale, setLocale] = useState<Locale>("ar");
  const { colors: c, typography: ty, layout: l, brand } = theme;
  const bodyFont = ARABIC_FONT_OPTIONS[ty.arabicFont].google;
  const headAr = ARABIC_FONT_OPTIONS[ty.arabicHeadingFont].google;
  const latin = LATIN_FONT_OPTIONS[ty.latinFont].google;
  const headEn = LATIN_FONT_OPTIONS[ty.latinHeadingFont].google;
  useGoogleFonts([ARABIC_FONT_OPTIONS[ty.arabicFont], ARABIC_FONT_OPTIONS[ty.arabicHeadingFont], LATIN_FONT_OPTIONS[ty.latinFont], LATIN_FONT_OPTIONS[ty.latinHeadingFont]]);

  const txt = (key: string) => textFor(theme, locale, key);
  const fontBody = locale === "ar" ? `"${bodyFont}", "${latin}", sans-serif` : `"${latin}", "${bodyFont}", sans-serif`;
  const fontHead = locale === "ar" ? `"${headAr}", sans-serif` : `"${headEn}", "${latin}", serif`;
  const src = (url: string) => (url.startsWith("/") ? `${storefrontUrl}${url}` : url);
  const r = `${l.radius}px`;
  const heading = { fontFamily: fontHead, fontWeight: ty.headingWeight, letterSpacing: locale === "en" ? `${ty.headingLetterSpacing}em` : undefined };
  const cols = Math.min(l.gridColumns, 4);
  const price = locale === "ar" ? "١٢٬٤٥٠ ج.م." : "EGP 12,450";

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">{labels.title}</h2>
          <span className="text-xs text-muted-foreground">{labels.hint}</span>
        </div>
        <div role="radiogroup" aria-label={labels.language} className="flex rounded-lg bg-muted p-1">
          {(["ar", "en"] as const).map((lng) => (
            <button
              key={lng}
              type="button"
              role="radio"
              aria-checked={locale === lng}
              onClick={() => setLocale(lng)}
              className={cn("h-8 rounded-md px-3 text-xs font-semibold", locale === lng ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {lng === "ar" ? "ع" : "EN"}
            </button>
          ))}
        </div>
      </div>

      {/* The preview "website" — everything inside uses ONLY the theme values */}
      <div
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={locale}
        className="overflow-hidden rounded-xl border shadow-sm"
        style={{ background: c.background, color: c.foreground, fontFamily: fontBody, fontSize: `${ty.baseSize * 0.8}px`, lineHeight: ty.lineHeight }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: c.headerBackground, color: c.headerForeground }}>
          {/* Wide logo (contains the name) → the written name is hidden, like on the website */}
          {brand.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src(brand.logo)} alt="" className={brand.logoShape === "wide" ? "h-7 w-auto max-w-[96px] object-contain" : "size-6 object-contain"} />
          )}
          <span className={brand.logoShape === "wide" && brand.logo ? "sr-only" : "font-bold"} style={{ fontFamily: fontHead }}>
            {brand.name[locale]}
          </span>
          <nav className="ms-auto hidden gap-3 text-[0.85em] opacity-90 sm:flex">
            <span>{txt("nav.home")}</span>
            <span>{txt("nav.products")}</span>
            <span>{txt("nav.categories")}</span>
            <span>{txt("nav.contact")}</span>
          </nav>
        </div>

        {/* Gold price strip */}
        <div className="flex justify-center gap-3 px-3 py-1.5 text-[0.8em]" style={{ background: c.secondary, color: c.secondaryForeground }}>
          <span className="font-semibold">{txt("gold.todayPrices")}</span>
          <span>{txt("gold.karatLabel").replace("{karat}", "21")}: {locale === "ar" ? "٤٬٧٩٥" : "4,795"}</span>
        </div>

        {/* Banner */}
        <div className="flex flex-col items-start gap-2 px-5 py-6" style={{ background: c.muted }}>
          <h3 className="text-[1.6em] leading-tight" style={heading}>
            {labels.heroTitle}
          </h3>
          <p className="text-[0.9em]" style={{ color: c.mutedForeground }}>
            {labels.heroText}
          </p>
          <span className="px-4 py-2 text-[0.85em] font-semibold" style={{ background: c.primary, color: c.primaryForeground, borderRadius: r }}>
            {txt("product.viewAll")}
          </span>
        </div>

        {/* Products */}
        <div className="flex flex-col gap-3 px-4 py-5">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[1.25em]" style={heading}>
              {labels.section}
            </h4>
            <span className="text-[0.8em]" style={{ color: c.primary }}>
              {txt("product.viewAll")}
            </span>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ aspectRatio: l.productImageRatio === "portrait" ? "3 / 4" : "1 / 1", background: c.muted, borderRadius: r }}
                >
                  <svg viewBox="0 0 24 24" className="size-1/3" fill="none" stroke={c.accent} strokeWidth="1.2" aria-hidden>
                    <circle cx="12" cy="14" r="6" />
                    <path d="M9 8l3-4 3 4" />
                  </svg>
                  {i === 0 && (
                    <span className="absolute start-1.5 top-1.5 px-1.5 text-[0.65em] font-semibold" style={{ background: c.primary, color: c.primaryForeground, borderRadius: `${Math.min(l.radius, 6)}px` }}>
                      {txt("product.new")}
                    </span>
                  )}
                  {i === 1 && (
                    <span className="absolute start-1.5 top-1.5 px-1.5 text-[0.65em] font-semibold" style={{ background: c.card, color: c.danger, borderRadius: `${Math.min(l.radius, 6)}px` }}>
                      {txt("product.outOfStock")}
                    </span>
                  )}
                </div>
                <span className="truncate text-[0.85em] font-medium">{labels.product}</span>
                {l.productCard === "detailed" && (
                  <span className="text-[0.75em]" style={{ color: c.mutedForeground }}>
                    {txt("gold.karatLabel").replace("{karat}", "21")} · 4.2 {txt("product.grams")}
                  </span>
                )}
                <span className="text-[0.85em] font-semibold" style={{ color: c.primary }}>
                  {price}
                </span>
              </div>
            ))}
          </div>
          <span className="mt-1 self-start border px-4 py-2 text-[0.85em] font-semibold" style={{ borderColor: c.border, background: c.card, borderRadius: r }}>
            {txt("product.addToCart")}
          </span>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-1 px-4 py-4 text-[0.8em]" style={{ background: c.footerBackground, color: c.footerForeground }}>
          <div className="flex items-center gap-2">
            {(brand.logoOnDark || brand.logo) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(brand.logoOnDark || brand.logo)} alt="" className={brand.logoShape === "wide" ? "h-6 w-auto max-w-[84px] object-contain" : "size-5 object-contain"} />
            )}
            <span className={brand.logoShape === "wide" ? "sr-only" : "font-bold"}>{brand.name[locale]}</span>
          </div>
          <span className="opacity-80">{brand.tagline[locale]}</span>
          <span className="opacity-60">{txt("footer.poweredBy")}</span>
        </div>
      </div>
    </section>
  );
}
