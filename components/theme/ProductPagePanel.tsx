/**
 * PRODUCT PAGE OPTIONS — the form of the sidebar page "Product page" (/product-page).
 * ------------------------------------------------------------------
 * Controls the page customers see when they open a product on the website:
 *   1) What shows   -> a switch for each part (code, stock label, quantity, Buy now, WhatsApp, price breakdown,
 *                      description, specifications, related products…)
 *   2) Buttons      -> for Add to cart / Buy now / Ask on WhatsApp: order (↑ ↓), filled or outline, colour,
 *                      text colour, icon · for all of them: side by side or stacked, size, corners
 *   3) Name, price & choices -> name/price size, "LE 96,065.00" price look, line under the price, choices as boxes,
 *                      weight in a box, quantity on its own line, icons after the text, photos stacked or with small photos
 *   4) Layout       -> side of the photos · position of the text · how many related products
 * Saved in theme.productPage (same Save draft → Publish as the rest of the theme).
 *   - Defaults and checks: lib/theme-chrome.ts → DEFAULT_PRODUCT_PAGE / parseProductPage
 *   - Button colours (shared with the website): lib/theme-chrome.ts → productButtonCss
 *   - Texts: dictionaries → "theme.productPage"
 *   - How the website uses it: storefront/app/[locale]/products/[slug]/page.tsx + components/product/ProductPurchase.tsx
 * To add a new switch: lib/theme-chrome.ts → PRODUCT_PAGE_PARTS, then TOP or BOTTOM below.
 */
"use client";

import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, MessageCircle, ShoppingBag, Zap } from "lucide-react";
import type { ProductButton, ProductButtonStyle, ProductPagePart, SiteTheme, ThemeProductPage } from "@/types";
import { productButtonCss, WHATSAPP_GREEN } from "@/lib/theme-chrome";
import { cn } from "@/lib/utils";
import { Choice, Toggle } from "./fields";
import { Group, OptionalColor } from "./chrome-fields";

/** The switches, grouped the way the page is laid out */
const TOP: ProductPagePart[] = ["newBadge", "sku", "priceNote", "stock", "quantity", "buyNow", "whatsapp", "priceBreakdown"];
const BOTTOM: ProductPagePart[] = ["description", "specifications", "related"];

/** Same sizes and corners as the website (storefront → ProductPurchase.tsx) */
const SIZE = { sm: "h-10 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-14 px-6 text-base" } as const;
const SHAPE = { theme: "rounded-md", square: "rounded-none", pill: "rounded-full" } as const;
const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;
const ICON = { cart: ShoppingBag, buy: Zap, whatsapp: MessageCircle } as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Labels = any;

export function ProductPagePanel({ theme, setTheme, labels: L, disabled }: { theme: SiteTheme; setTheme: (next: (t: SiteTheme) => SiteTheme) => void; labels: Labels; disabled?: boolean }) {
  const P = L.productPage;
  const p = theme.productPage;
  const set = (patch: Partial<ThemeProductPage>) => setTheme((t) => ({ ...t, productPage: { ...t.productPage, ...patch } }));
  const setButton = (k: ProductButton, patch: Partial<ProductButtonStyle>) => set({ buttons: { ...p.buttons, [k]: { ...p.buttons[k], ...patch } } });
  const moveButton = (i: number, by: number) => {
    const next = [...p.buttonOrder];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    set({ buttonOrder: next });
  };
  const names: Record<ProductButton, string> = { cart: P.buttons.cart, buy: P.buttons.buy, whatsapp: P.buttons.whatsapp };
  // "Add to cart" is always there; the other two follow their switches above
  const isOn = (k: ProductButton) => (k === "cart" ? true : k === "buy" ? p.show.buyNow : p.show.whatsapp);
  const iconButton = "flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  const switches = (parts: ProductPagePart[]) => (
    <ul className="flex flex-col gap-2">
      {parts.map((k) => (
        <li key={k} className="rounded-lg border px-3 py-2">
          <Toggle label={P.parts[k]} checked={p.show[k]} disabled={disabled} onChange={(v) => set({ show: { ...p.show, [k]: v } })} />
          {P.hints[k] && <p className="mt-1 text-xs text-muted-foreground">{P.hints[k]}</p>}
        </li>
      ))}
    </ul>
  );

  /* ---------- sketch of the buttons, with the website's own colours ---------- */
  const shown = p.buttonOrder.filter(isOn);
  const sketchButton = (k: ProductButton, width: string) => {
    const Icon = ICON[k];
    return (
      <span key={k} style={productButtonCss(k, p.buttons[k])} className={cn("inline-flex items-center justify-center gap-2 border font-semibold", SIZE[p.buttonSize], SHAPE[p.buttonShape], width)}>
        {p.buttons[k].icon && <Icon className={cn("size-4 shrink-0", p.iconEnd && "order-last")} />}
        {names[k]}
      </span>
    );
  };
  const quantity = <span className={cn("inline-flex shrink-0 items-center justify-center border px-4 text-sm", SIZE[p.buttonSize], SHAPE[p.buttonShape])}>− 1 +</span>;
  const siteColors = { "--primary": theme.colors.primary, "--primary-foreground": theme.colors.primaryForeground, "--border": "#d9d4cb", background: theme.colors.background, color: theme.colors.foreground } as CSSProperties;

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Group title={P.partsTitle} hint={P.partsHint}>
        <p className="text-sm font-semibold">{P.groups.top}</p>
        {switches(TOP)}
        <p className="text-sm font-semibold">{P.groups.bottom}</p>
        {switches(BOTTOM)}
      </Group>

      <div className="flex min-w-0 flex-col gap-5">
        {/* ===== Buttons ===== */}
        <Group title={P.buttonsTitle} hint={P.buttonsHint}>
          <div className="rounded-lg border p-4" style={siteColors}>
            <p className="mb-3 text-xs opacity-60">{P.preview}</p>
            {p.buttonsLayout === "stack" ? (
              <div className="flex flex-col gap-3">
                {shown.map((k) =>
                  k === "cart" && p.show.quantity ? (
                    <div key={k} className="flex gap-3">
                      {quantity}
                      {sketchButton(k, "flex-1")}
                    </div>
                  ) : (
                    sketchButton(k, "w-full")
                  ),
                )}
              </div>
            ) : (
              <div className={cn("flex flex-wrap gap-3", JUSTIFY[p.align])}>
                {p.show.quantity && quantity}
                {shown.map((k) => sketchButton(k, "min-w-36 flex-1"))}
              </div>
            )}
          </div>

          {/* One card per button, in the order they show on the website */}
          {p.buttonOrder.map((k, i) => {
            const b = p.buttons[k];
            return (
              <div key={k} className={cn("flex flex-col gap-3 rounded-lg border p-3", !isOn(k) && "opacity-60")}>
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 font-semibold">
                    {names[k]}
                    {!isOn(k) && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">{P.hiddenNote}</span>}
                  </span>
                  <button type="button" disabled={disabled || i === 0} onClick={() => moveButton(i, -1)} aria-label={`${P.up}: ${names[k]}`} className={iconButton}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" disabled={disabled || i === p.buttonOrder.length - 1} onClick={() => moveButton(i, 1)} aria-label={`${P.down}: ${names[k]}`} className={iconButton}>
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <Choice label={P.style} value={b.style} disabled={disabled} options={(["filled", "outline"] as const).map((v) => ({ value: v, label: P.styles[v] }))} onChange={(v) => setButton(k, { style: v })} />
                <OptionalColor label={P.color} autoLabel={P.chooseColor} value={b.color} fallback={k === "whatsapp" ? WHATSAPP_GREEN : theme.colors.primary} onChange={(v) => setButton(k, { color: v })} labels={L.colors} disabled={disabled} />
                {b.color === "" && <p className="-mt-2 text-xs text-muted-foreground">{k === "whatsapp" ? P.whatsappAuto : P.colorAuto}</p>}
                <OptionalColor
                  label={P.textColor}
                  autoLabel={P.chooseColor}
                  value={b.textColor}
                  fallback={b.style === "filled" ? "#FFFFFF" : theme.colors.primary}
                  against={b.style === "filled" ? b.color || (k === "whatsapp" ? WHATSAPP_GREEN : theme.colors.primary) : theme.colors.background}
                  onChange={(v) => setButton(k, { textColor: v })}
                  labels={L.colors}
                  disabled={disabled}
                />
                <Toggle label={P.icon} checked={b.icon} disabled={disabled} onChange={(v) => setButton(k, { icon: v })} />
              </div>
            );
          })}

          <p className="border-t pt-4 text-sm font-semibold">{P.allTitle}</p>
          <Choice label={P.layout} value={p.buttonsLayout} disabled={disabled} options={(["stack", "row"] as const).map((v) => ({ value: v, label: P.layouts[v] }))} onChange={(v) => set({ buttonsLayout: v })} />
          <Choice label={P.size} value={p.buttonSize} disabled={disabled} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: P.sizes[v] }))} onChange={(v) => set({ buttonSize: v })} />
          <Choice label={P.shape} value={p.buttonShape} disabled={disabled} options={(["theme", "square", "pill"] as const).map((v) => ({ value: v, label: P.shapes[v] }))} onChange={(v) => set({ buttonShape: v })} />
          <p className="text-xs text-muted-foreground">{P.textsHint}</p>
        </Group>

        {/* ===== Name, price & choices ===== (website: ProductPurchase.tsx + ProductGallery.tsx) */}
        <Group title={P.detailsTitle} hint={P.detailsHint}>
          <Choice label={P.titleSize} value={p.titleSize} disabled={disabled} options={(["md", "lg", "xl"] as const).map((v) => ({ value: v, label: P.textSizes[v] }))} onChange={(v) => set({ titleSize: v })} />
          <Choice label={P.priceSize} value={p.priceSize} disabled={disabled} options={(["md", "lg", "xl"] as const).map((v) => ({ value: v, label: P.textSizes[v] }))} onChange={(v) => set({ priceSize: v })} />
          <Toggle label={P.cardPriceFormat} checked={p.cardPriceFormat} disabled={disabled} onChange={(v) => set({ cardPriceFormat: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{P.cardPriceFormatHint}</p>
          <Toggle label={P.divider} checked={p.divider} disabled={disabled} onChange={(v) => set({ divider: v })} />
          <Choice label={P.optionsStyle} value={p.optionsStyle} disabled={disabled} options={(["pills", "boxes"] as const).map((v) => ({ value: v, label: P.optionsStyles[v] }))} onChange={(v) => set({ optionsStyle: v })} />
          <Toggle label={P.factsBox} checked={p.factsBox} disabled={disabled} onChange={(v) => set({ factsBox: v })} />
          <Toggle label={P.quantityOwnRow} checked={p.quantityOwnRow} disabled={disabled} onChange={(v) => set({ quantityOwnRow: v })} />
          <Toggle label={P.iconEnd} checked={p.iconEnd} disabled={disabled} onChange={(v) => set({ iconEnd: v })} />
          <Choice label={P.gallery} value={p.gallery} disabled={disabled} options={(["thumbs", "stack"] as const).map((v) => ({ value: v, label: P.galleries[v] }))} onChange={(v) => set({ gallery: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{P.galleryHint}</p>
        </Group>

        {/* ===== Layout ===== */}
        <Group title={P.layoutTitle}>
          <Choice label={P.imageSide} value={p.imageSide} disabled={disabled} options={(["start", "end"] as const).map((v) => ({ value: v, label: P.sides[v] }))} onChange={(v) => set({ imageSide: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{P.imageSideHint}</p>
          <Choice label={P.align} value={p.align} disabled={disabled} options={(["start", "center", "end"] as const).map((v) => ({ value: v, label: P.aligns[v] }))} onChange={(v) => set({ align: v })} />
          <p className="-mt-2 text-xs text-muted-foreground">{P.alignHint}</p>
          {p.show.related && <Choice label={P.relatedCount} value={p.relatedCount} disabled={disabled} options={([4, 8] as const).map((v) => ({ value: v, label: String(v) }))} onChange={(v) => set({ relatedCount: v })} />}
          <p className="text-xs text-muted-foreground">{P.weightHint}</p>
        </Group>
      </div>
    </div>
  );
}
