/**
 * THEME RULES — checked on the server before a theme is saved (and in the editor for instant feedback).
 * Stops broken values from reaching the live website: colours must be #RRGGBB, sizes stay in safe
 * ranges, images must be web addresses, texts only for keys the website really has.
 */
import { z } from "zod";
import { ARABIC_FONTS, LATIN_FONTS, type FilterSection } from "@/types";
import arTexts from "@/config/storefront-texts/ar.json";
import { MAX_EXTRA_LINKS, MAX_FOOTER_GROUPS, MAX_GROUP_LINKS, parseBuilder, parseSearch, parseDarkMode, parseProductCard, parseProductPage, safeHref } from "@/lib/theme-chrome";
import { isIcon, type IconSlot } from "@/lib/icon-library";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "color");
/** "" (none), a site path "/…" or a full http(s) address */
const imageUrl = z
  .string()
  .max(500)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https?:\/\/[^\s"'<>]+$/.test(v), "url");
const localized = (max: number) => z.object({ ar: z.string().trim().max(max), en: z.string().trim().max(max) });

/** Every text key the storefront has, e.g. "nav.home" */
export const TEXT_KEYS: string[] = (() => {
  const out: string[] = [];
  const walk = (o: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object") walk(v as Record<string, unknown>, `${prefix}${k}.`);
      else out.push(`${prefix}${k}`);
    }
  };
  walk(arTexts as Record<string, unknown>, "");
  return out;
})();
const keySet = new Set(TEXT_KEYS);

const overrides = z
  .record(z.string(), z.string().max(600))
  .refine((o) => Object.keys(o).every((k) => keySet.has(k)), "unknown text key")
  .refine((o) => Object.keys(o).length <= TEXT_KEYS.length);

/* ----- header & footer (pages "Header" / "Footer") ----- */
/** "" = automatic, or #RRGGBB */
const optionalHex = z.union([z.literal(""), hex]);
/** "" or a safe address: /path, #anchor, http(s)://, mailto:, tel: */
const href = z.string().max(300).refine((v) => v === "" || safeHref(v) !== "", "url");
const extraLinks = z.array(z.object({ label: localized(60), href })).max(MAX_EXTRA_LINKS);
const size = z.enum(["sm", "md", "lg"]);
/** An icon id that exists in the icon library for this slot (lib/icon-library.ts) */
const iconId = (slot: IconSlot) => z.string().max(40).refine((v) => isIcon(slot, v), "icon");

const headerSchema = z.object({
  layout: z.enum(["logo-start", "logo-center", "stacked"]),
  menuAlign: z.enum(["start", "center", "end"]),
  height: z.enum(["compact", "normal", "tall"]),
  width: z.enum(["boxed", "full"]),
  border: z.boolean(),
  shadow: z.boolean(),
  logoSize: size,
  showName: z.enum(["auto", "show", "hide"]),
  hoverColor: optionalHex,
  menu: z.object({
    home: z.boolean(),
    products: z.boolean(),
    categories: z.boolean(),
    pages: z.boolean(),
    pageSlugs: z.array(z.string().min(1).max(60)).max(20).nullable().default(null),
    order: z.array(z.string().min(1).max(80)).max(60).default([]),
    extra: extraLinks,
    // Drop-down lists (Header → Menu links). Missing (older themes) → off
    categoriesDropdown: z.boolean().default(false),
    categoriesLabel: localized(40).default({ ar: "", en: "" }),
    pagesDropdown: z.object({ enabled: z.boolean(), label: localized(40) }).default({ enabled: false, label: { ar: "", en: "" } }),
    categoriesDropdownIds: z.array(z.string().min(1).max(100)).max(40).default([]),
    shopAll: z.object({ show: z.boolean(), label: localized(40) }).default({ show: true, label: { ar: "", en: "" } }),
  }),
  // Free positions (Header → Positions). Checked and completed by lib/theme-chrome.ts → parseBuilder
  builder: z.unknown().transform((v) => parseBuilder(v)),
  // Search bar look (Header → Search bar). Checked and completed by lib/theme-chrome.ts → parseSearch
  search: z.unknown().transform((v) => parseSearch(v)),
  // Look of the drop-down lists. Missing (older themes) → the original look
  dropdown: z
    .object({ background: optionalHex, foreground: optionalHex, border: z.boolean(), shadow: z.boolean(), textSize: size, spacing: z.enum(["compact", "normal", "roomy"]) })
    .default({ background: "", foreground: "", border: true, shadow: true, textSize: "sm", spacing: "normal" }),
  menuSize: size,
  menuWeight: z.enum(["normal", "bold"]),
  menuUppercase: z.boolean(),
  // Look of the open page's link. Missing (older themes) → "none"
  activeStyle: z.enum(["none", "color", "underline", "bold", "pill"]).default("none"),
  activeColor: optionalHex.default(""),
  activeTextColor: optionalHex.default(""),
  icons: z.object({
    search: z.boolean(),
    account: z.boolean(),
    cart: z.boolean(),
    language: z.boolean(),
    size,
    set: z.object({ search: iconId("search"), account: iconId("account"), cart: iconId("cart"), menu: iconId("menu"), language: iconId("language") }),
    display: z.enum(["icons", "text"]).default("icons"),
  }),
  transparent: z.object({
    enabled: z.boolean(),
    opacity: z.number().int().min(0).max(90),
    blur: z.boolean(),
    foreground: optionalHex,
    // Added later (missing → off): light logo over the picture, soft dark shade from the top
    logoOnDark: z.boolean().default(false),
    gradient: z.boolean().default(false),
  }),
  announcement: z.object({ enabled: z.boolean(), text: localized(200), href, background: optionalHex, foreground: optionalHex, align: z.enum(["start", "center", "end"]).default("center"), phoneIcon: z.boolean().default(false) }),
});

const footerSchema = z.object({
  layout: z.enum(["columns", "centered"]),
  columns: z
    .array(z.enum(["about", "links", "contact", "social", "groups"]))
    .max(5)
    .refine((c) => new Set(c).size === c.length, "duplicate"),
  align: z.enum(["start", "center"]),
  spacing: z.enum(["compact", "normal", "spacious"]),
  width: z.enum(["boxed", "full"]),
  borderTop: z.boolean(),
  showLogo: z.boolean(),
  logoSize: size,
  showName: z.boolean(),
  showTagline: z.boolean(),
  headingColor: optionalHex,
  links: z.object({ home: z.boolean(), products: z.boolean(), contact: z.boolean(), pages: z.boolean(), extra: extraLinks }),
  contact: z.object({ phone: z.boolean(), whatsapp: z.boolean(), email: z.boolean(), address: z.boolean(), hours: z.boolean() }),
  contactDisplay: z.enum(["details", "icons", "both"]),
  contactDirection: z.enum(["column", "row"]),
  contactAlign: z.enum(["start", "center", "end"]),
  contactIconStyle: z.enum(["plain", "circle"]),
  contactIcons: z.object({ phone: iconId("phone"), whatsapp: iconId("whatsapp"), email: iconId("email"), address: iconId("address"), hours: iconId("hours") }),
  transparent: z.boolean(),
  socialStyle: z.enum(["plain", "circle", "square"]),
  // Added later — missing in older themes → the original look
  socialPlacement: z.enum(["column", "row", "top"]).default("column"),
  headingStyle: z.enum(["classic", "caps"]).default("classic"),
  newsletter: z
    .object({ show: z.boolean(), placeholder: localized(60), button: localized(30), thanks: localized(120) })
    .default({ show: false, placeholder: { ar: "", en: "" }, button: { ar: "", en: "" }, thanks: { ar: "", en: "" } }),
  divider: imageUrl.default(""),
  groups: z
    .array(z.object({ title: localized(60), links: z.array(z.object({ label: localized(60), href })).max(MAX_GROUP_LINKS), text: localized(300) }))
    .max(MAX_FOOTER_GROUPS)
    .default([]),
  contactUnderAbout: z.boolean().default(false),
  headingSize: size.default("sm"),
  bottom: z.object({
    show: z.boolean(),
    text: localized(200),
    poweredBy: z.boolean(),
    align: z.enum(["start", "center", "between"]),
    background: optionalHex,
    links: extraLinks.default([]),
    foreground: optionalHex.default(""),
    mark: z.boolean().default(false),
    endText: localized(80).default({ ar: "", en: "" }),
  }),
  backToTop: z.boolean(),
});

export const siteThemeSchema = z.object({
  brand: z.object({
    name: localized(80).refine((v) => v.ar.length > 0 && v.en.length > 0, "required"),
    tagline: localized(160),
    logo: imageUrl.refine((v) => v !== "", "required"),
    logoOnDark: imageUrl,
    logoShape: z.enum(["square", "wide"]).optional(),
    favicon: imageUrl,
    shareImage: imageUrl,
  }),
  colors: z.object({
    primary: hex,
    primaryForeground: hex,
    secondary: hex,
    secondaryForeground: hex,
    accent: hex,
    background: hex,
    foreground: hex,
    card: hex,
    muted: hex,
    mutedForeground: hex,
    border: hex,
    headerBackground: hex,
    headerForeground: hex,
    footerBackground: hex,
    footerForeground: hex,
    danger: hex,
  }),
  typography: z.object({
    arabicFont: z.enum(ARABIC_FONTS),
    arabicHeadingFont: z.enum(ARABIC_FONTS),
    latinFont: z.enum(LATIN_FONTS),
    latinHeadingFont: z.enum(LATIN_FONTS),
    baseSize: z.number().int().min(14).max(18),
    headingWeight: z.union([z.literal(400), z.literal(500), z.literal(600), z.literal(700), z.literal(800)]),
    lineHeight: z.number().min(1.2).max(2),
    headingLetterSpacing: z.number().min(-0.02).max(0.1),
  }),
  layout: z.object({
    containerWidth: z.union([z.literal(1152), z.literal(1280), z.literal(1440), z.literal(1600)]),
    radius: z.number().int().min(0).max(24),
    stickyHeader: z.boolean(),
    // Page path line ("Home / Categories / Rings"). Missing (older themes) → shown
    breadcrumbs: z.boolean().default(true),
    productCard: z.enum(["minimal", "detailed"]),
    productImageRatio: z.enum(["square", "portrait"]),
    gridColumns: z.union([z.literal(3), z.literal(4), z.literal(5)]),
    // Product cards (Layout → Product cards). Checked and completed by lib/theme-chrome.ts → parseProductCard
    card: z.unknown().transform((v) => parseProductCard(v)),
  }),
  header: headerSchema,
  footer: footerSchema,
  // Product filter (sidebar → Product filter). Missing (theme saved before it existed) → every section, all categories
  filters: z
    .object({
      sections: z.array(z.enum(["category", "offers", "price", "karat", "metal", "weight", "collection", "stock"])).max(8),
      categoryIds: z.array(z.string().min(1).max(100)).max(60),
      // Where & how the filter shows (added later — missing → the original sidebar)
      display: z.enum(["sidebar", "drawer"]).default("sidebar"),
      side: z.enum(["start", "end"]).default("start"),
      buttonLook: z.enum(["icon", "text", "both"]).default("both"),
      buttonPosition: z.enum(["start", "end"]).default("end"),
      showCount: z.boolean().default(true),
      icon: iconId("filter").default("sliders-line"),
      viewSwitch: z.boolean().default(false),
    })
    .default(() => ({ sections: ["category", "offers", "price", "karat", "metal", "weight", "collection", "stock"] as FilterSection[], categoryIds: [], display: "sidebar" as const, side: "start" as const, buttonLook: "both" as const, buttonPosition: "end" as const, showCount: true, icon: "sliders-line", viewSwitch: false })),
  // Product page (sidebar → Product page). Checked and completed by lib/theme-chrome.ts → parseProductPage
  productPage: z
    .unknown()
    .transform((v) => parseProductPage(v)),
  texts: z.object({ ar: overrides, en: overrides }),
  // Dark mode (Theme & design → Dark mode). Checked and completed below with the normal colours
  darkMode: z.unknown(),
})
  .transform((t) => ({ ...t, darkMode: parseDarkMode(t.darkMode, t.colors) }));
