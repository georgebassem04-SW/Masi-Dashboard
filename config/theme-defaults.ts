/**
 * THEME DEFAULTS AND OPTIONS
 * ------------------------------------------------------------------
 * DEFAULT_THEME  -> what the website looks like before the designer changes anything.
 *                   MASI: matches the MASI Figma file (colours, Helvetica Now + Arizona Flare, square corners,
 *                   header/footer layout). Everything here can be changed later in the dashboard → Theme & design. "Reset to default" returns here.
 * FONT_OPTIONS   -> the fonts the designer can pick. To add one: add it in storefront/lib/fonts.ts,
 *                   in ARABIC_FONTS / LATIN_FONTS (types/theme.ts, both projects) and here.
 */
import type { ArabicFont, LatinFont, SiteTheme } from "@/types";
import { DEFAULT_SEARCH, SEARCH_PRESETS } from "@/lib/theme-chrome";
import { DEFAULT_FILTERS, DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_PRODUCT_CARD, DEFAULT_PRODUCT_PAGE, suggestedDarkColors } from "@/lib/theme-chrome";

/** The normal (light) colours of a new store */
const DEFAULT_COLORS: SiteTheme["colors"] = {
    // MASI — from the Figma file: deep green words and buttons on a warm off-white page, soft gold accent
    primary: "#04231E",
    primaryForeground: "#FFFFFF",
    secondary: "#ECECE6",
    secondaryForeground: "#04231E",
    accent: "#B08D57",
    background: "#F5F5F2",
    foreground: "#04231E",
    card: "#FFFFFF",
    muted: "#ECECE6",
    mutedForeground: "#4D625D",
    border: "#DCDDD6",
    headerBackground: "#F5F5F2",
    headerForeground: "#04231E",
    footerBackground: "#F5F5F2",
    footerForeground: "#04231E",
    danger: "#B42318",
  };

export const DEFAULT_THEME: SiteTheme = {
  brand: {
    name: { ar: "ماسي", en: "MASI" },
    tagline: { ar: "مجوهرات ماسي — القاهرة منذ 1963", en: "MASI Jewelry — Cairo, since 1963" },
    // Files of the storefront's public folder (public/clients/masi). Replace them from the Media library any time
    logo: "/clients/masi/logo.svg",
    logoShape: "wide", // the logo already contains the name, so the written name is hidden
    // White logo, shown while the header is see-through over the homepage picture
    logoOnDark: "/clients/masi/logo-light.svg",
    favicon: "/clients/masi/favicon.png", // tab icon: the MASI oval mark
    shareImage: "/clients/masi/home/hero.jpg",
  },
  colors: DEFAULT_COLORS,
  typography: {
    arabicFont: "ibmPlexArabic",
    arabicHeadingFont: "notoNaskh",
    // MASI's own fonts (files in storefront/public/fonts/masi) — need a web licence before going live
    latinFont: "helveticaNow",
    latinHeadingFont: "arizonaFlare",
    baseSize: 14,
    headingWeight: 400,
    lineHeight: 1.6,
    headingLetterSpacing: 0,
  },
  layout: {
    containerWidth: 1280,
    radius: 0, // square corners everywhere, like the design
    stickyHeader: true,
    breadcrumbs: true, // "HOME / JEWELRY / NECKLACES" on the product page
    productCard: "minimal",
    productImageRatio: "portrait",
    gridColumns: 3,
    // Product cards like the design: soft background, white photos blended in, dots under the picture,
    // "NEW" in a small white box, name + grey "From 7,000.00 LE"
    card: {
      ...DEFAULT_PRODUCT_CARD,
      align: "start",
      newBadge: true,
      hoverImage: false,
      soldOut: "overlay",
      fromPrice: true,
      frame: false,
      nameSize: "sm",
      priceSize: "sm",
      priceSymbol: { ar: "ج.م", en: "LE" },
      priceDecimals: true,
      imageBackground: "#F5F5F2",
      imageDots: true,
      badgeLook: "box",
      blendImage: true,
      priceColor: "muted",
      soldOutLook: { ...DEFAULT_PRODUCT_CARD.soldOutLook, shade: "#F5F5F2", strength: 40, labelBackground: "#FFFFFF", labelText: "#04231E", shape: "square", size: "sm" },
    },
  },
  // Top bar and footer options (pages "Header" / "Footer") — defaults in lib/theme-chrome.ts
  header: {
    ...DEFAULT_HEADER,
    width: "full",
    height: "compact",
    logoSize: "md",
    showName: "hide",
    hoverColor: "",
    activeStyle: "none",
    menuSize: "sm",
    menuUppercase: true,
    menu: {
      ...DEFAULT_HEADER.menu,
      // The ☰ side menu: Home · All jewelry · Shop by category · The Story · Contact
      products: true,
      categories: true,
      pageSlugs: ["about", "contact"],
      categoriesDropdown: false,
      shopAll: { show: true, label: { ar: "كل المجوهرات", en: "All jewelry" } },
    },
    // Like the design: ☰ at the start, the logo in the middle, search + bag at the end (phones the same)
    builder: {
      enabled: true,
      items: [
        { part: "text", row: "top", zone: "center", show: false },
        { part: "drawer", row: "main", zone: "start", show: true },
        { part: "menu", row: "main", zone: "start", show: false },
        { part: "logo", row: "main", zone: "center", show: true },
        { part: "language", row: "main", zone: "end", show: false },
        { part: "search", row: "main", zone: "end", show: true },
        { part: "account", row: "main", zone: "end", show: false },
        { part: "cart", row: "main", zone: "end", show: true },
      ],
      topHeight: "compact",
      bottomHeight: "normal",
      rowLines: false,
    },
    // MASI's own icons: the bag inspired by the "M", the menu inspired by the "I", a thin magnifier
    icons: { ...DEFAULT_HEADER.icons, size: "md", display: "icons", set: { ...DEFAULT_HEADER.icons.set, search: "search-thin", cart: "masi-bag", menu: "masi-menu" } },
    border: true,
    // See-through over the homepage picture with white icons + the white logo and a soft dark shade at the top
    transparent: { enabled: true, opacity: 0, blur: false, foreground: "#FFFFFF", logoOnDark: true, gradient: true },
    search: { ...DEFAULT_SEARCH, look: "boxed", width: "full", floatingLabel: false, placeholder: { ar: "ابحث عن قطعة", en: "Search for a piece" }, buttonText: { ar: "", en: "" }, closeButton: true, fieldBackground: "#FFFFFF", fieldBorder: "#DCDDD6", buttonHoverColor: "#04231E", buttonHoverTextColor: "#FFFFFF" },
    announcement: { ...DEFAULT_HEADER.announcement, enabled: false },
  },
  // Product filter: a small "Filter" button next to "Sort by", opening a panel from the start
  filters: { ...DEFAULT_FILTERS, display: "drawer", side: "start", buttonLook: "both", buttonPosition: "end", showCount: true, icon: "sliders-line", viewSwitch: false },
  // Product page like the design: deep-green square buttons, price "From 7,000 LE", photos with small photos under them
  productPage: {
    ...DEFAULT_PRODUCT_PAGE,
    show: { ...DEFAULT_PRODUCT_PAGE.show, sku: false, priceNote: false, stock: false, whatsapp: false, priceBreakdown: false },
    buttons: {
      cart: { style: "filled", color: "#04231E", textColor: "#FFFFFF", icon: false },
      buy: { style: "outline", color: "#04231E", textColor: "#04231E", icon: false },
      whatsapp: { style: "outline", color: "", textColor: "", icon: true },
    },
    buttonsLayout: "stack",
    buttonSize: "lg",
    buttonShape: "square",
    titleSize: "md",
    priceSize: "md",
    cardPriceFormat: true,
    optionsStyle: "boxes",
    factsBox: false,
    quantityOwnRow: false,
    gallery: "thumbs",
    divider: true,
    iconEnd: false,
  },
  // Dark mode (tab "Dark mode"): off until the client switches it on; suggested colours in lib/theme-chrome.ts
  darkMode: { enabled: false, default: "light", colors: suggestedDarkColors(DEFAULT_COLORS) },
  // Footer like the design: social icons + newsletter + gold chain on top, three centred columns
  // (Information · Shop now · About us), then a dark last line "© 2026 MASI JEWELRY · ⬮ · EST · Cairo · 26"
  footer: {
    ...DEFAULT_FOOTER,
    columns: ["groups"],
    align: "center",
    spacing: "spacious",
    borderTop: true,
    showLogo: false,
    showName: false,
    headingStyle: "caps",
    socialStyle: "plain",
    socialPlacement: "top",
    newsletter: { show: true, placeholder: { ar: "اكتب بريدك الإلكتروني", en: "Enter your email address" }, button: { ar: "اشترك", en: "Subscribe" }, thanks: { ar: "شكرًا لك — تم تسجيلك.", en: "Thank you — you're on the list." } },
    divider: "/clients/masi/home/divider.png",
    groups: [
      {
        title: { ar: "معلومات", en: "Information" },
        links: [
          { label: { ar: "تواصل معنا", en: "Contact Us" }, href: "/contact" },
          { label: { ar: "الأسئلة الشائعة", en: "Faq" }, href: "/faq" },
          { label: { ar: "الفروع", en: "Stores" }, href: "/contact" },
          { label: { ar: "العناية بالمجوهرات", en: "Jewelry Care" }, href: "/faq" },
          { label: { ar: "ضمان المنتج", en: "Product Warranty" }, href: "/pages/returns" },
        ],
        text: { ar: "", en: "" },
      },
      {
        title: { ar: "تسوّق", en: "Shop Now" },
        links: [
          { label: { ar: "الرئيسية", en: "Home" }, href: "/" },
          { label: { ar: "ذهب", en: "Gold" }, href: "/products" },
          { label: { ar: "ألماس", en: "Diamond" }, href: "/products" },
          { label: { ar: "خواتم", en: "Rings" }, href: "/categories/rings" },
          { label: { ar: "قلادات", en: "Necklace" }, href: "/categories/necklaces" },
        ],
        text: { ar: "", en: "" },
      },
      {
        title: { ar: "عن ماسي", en: "About Us" },
        links: [
          { label: { ar: "من نحن", en: "Who We Are" }, href: "/about" },
          { label: { ar: "المؤسسون", en: "Our Founders" }, href: "/about" },
          { label: { ar: "التزامنا", en: "Our Commitment" }, href: "/about" },
          { label: { ar: "نقاط البيع", en: "Stockists" }, href: "/contact" },
          { label: { ar: "الحرفية", en: "Craftsmanship" }, href: "/about" },
        ],
        text: { ar: "", en: "" },
      },
    ],
    bottom: {
      ...DEFAULT_FOOTER.bottom,
      text: { ar: "© {year} ماسي للمجوهرات", en: "© {year} MASI JEWELRY" },
      poweredBy: false,
      background: "#0E0A08",
      foreground: "#D9D4CB",
      mark: true,
      endText: { ar: "تأسست · *القاهرة* · 26", en: "EST · *Cairo* · 26" },
      links: [],
    },
    backToTop: false,
  },
  texts: { ar: {}, en: {} },
};

/**
 * label   -> name shown in the picker
 * google  -> the Google Fonts family (used to preview the font inside the dashboard)
 * weights -> the weights this family really has on Google Fonts (asking for a missing one breaks the preview)
 */
export type FontOption = { label: string; google: string; weights: string; /** Own font file instead of Google Fonts (path on the dashboard) */ css?: string };
export const ARABIC_FONT_OPTIONS: Record<ArabicFont, FontOption> = {
  cairo: { label: "Cairo — القاهرة", google: "Cairo", weights: "400;500;600;700;800" },
  tajawal: { label: "Tajawal — تجوال", google: "Tajawal", weights: "400;500;700;800" },
  almarai: { label: "Almarai — المراعي", google: "Almarai", weights: "400;700;800" },
  ibmPlexArabic: { label: "IBM Plex Sans Arabic", google: "IBM Plex Sans Arabic", weights: "400;500;600;700" },
  notoKufi: { label: "Noto Kufi Arabic — كوفي", google: "Noto Kufi Arabic", weights: "400;500;600;700;800" },
  elMessiri: { label: "El Messiri — المسيري", google: "El Messiri", weights: "400;500;600;700" },
  readexPro: { label: "Readex Pro", google: "Readex Pro", weights: "400;500;600;700" },
  // Classic / luxury
  amiri: { label: "Amiri — أميري (classic naskh)", google: "Amiri", weights: "400;700" },
  notoNaskh: { label: "Noto Naskh Arabic — نسخ", google: "Noto Naskh Arabic", weights: "400;500;600;700" },
  markazi: { label: "Markazi Text — مركزي (elegant)", google: "Markazi Text", weights: "400;500;600;700" },
  lateef: { label: "Lateef — لطيف", google: "Lateef", weights: "400;500;600;700;800" },
  arefRuqaa: { label: "Aref Ruqaa — رقعة (calligraphy)", google: "Aref Ruqaa", weights: "400;700" },
  reemKufi: { label: "Reem Kufi — ريم كوفي", google: "Reem Kufi", weights: "400;500;600;700" },
  alexandria: { label: "Alexandria — الإسكندرية (modern)", google: "Alexandria", weights: "400;500;600;700;800" },
  changa: { label: "Changa — تشانجا", google: "Changa", weights: "400;500;600;700;800" },
};

export const LATIN_FONT_OPTIONS: Record<LatinFont, FontOption> = {
  inter: { label: "Inter (modern)", google: "Inter", weights: "400;500;600;700;800" },
  playfair: { label: "Playfair Display (elegant serif)", google: "Playfair Display", weights: "400;500;600;700;800" },
  cormorant: { label: "Cormorant Garamond (luxury serif)", google: "Cormorant Garamond", weights: "400;500;600;700" },
  montserrat: { label: "Montserrat (geometric)", google: "Montserrat", weights: "400;500;600;700;800" },
  lora: { label: "Lora (classic serif)", google: "Lora", weights: "400;500;600;700" },
  poppins: { label: "Poppins (rounded)", google: "Poppins", weights: "400;500;600;700;800" },
  // Luxury
  cinzel: { label: "Cinzel (luxury capitals)", google: "Cinzel", weights: "400;500;600;700;800" },
  bodoniModa: { label: "Bodoni Moda (fashion serif)", google: "Bodoni Moda", weights: "400;500;600;700;800" },
  ebGaramond: { label: "EB Garamond (classic luxury)", google: "EB Garamond", weights: "400;500;600;700;800" },
  libreBaskerville: { label: "Libre Baskerville (refined serif)", google: "Libre Baskerville", weights: "400;500;600;700" },
  marcellus: { label: "Marcellus (elegant, one weight)", google: "Marcellus", weights: "400" },
  dmSerifDisplay: { label: "DM Serif Display (bold luxury, one weight)", google: "DM Serif Display", weights: "400" },
  jost: { label: "Jost (clean luxury sans)", google: "Jost", weights: "400;500;600;700;800" },
  raleway: { label: "Raleway (elegant sans)", google: "Raleway", weights: "400;500;600;700;800" },
  // Client's own fonts (no Google file): `css` = the dashboard's own copy for the preview (public/fonts/masi/fonts.css)
  helveticaNow: { label: "Helvetica Now Display (MASI)", google: "Helvetica Now Display", weights: "300;400;500;700", css: "/fonts/masi/fonts.css" },
  arizonaFlare: { label: "ABC Arizona Flare (MASI)", google: "ABC Arizona Flare", weights: "300;400", css: "/fonts/masi/fonts.css" },
};

/** Ready-made colour sets the designer can start from (then fine-tune) */
export const COLOR_PRESETS: { key: string; label: { ar: string; en: string }; colors: Partial<SiteTheme["colors"]> }[] = [
  { key: "classicGold", label: { ar: "ذهبي كلاسيكي", en: "Classic gold" }, colors: {} },
  {
    key: "ivory",
    label: { ar: "عاجي هادئ", en: "Soft ivory" },
    colors: { primary: "#8A6420", secondary: "#F4EFE6", background: "#FBF8F2", card: "#FFFFFF", headerBackground: "#1F1D1A", footerBackground: "#1F1D1A", border: "#E4DED2", accent: "#C9A961" },
  },
  {
    key: "roseGold",
    label: { ar: "ذهب وردي", en: "Rose gold" },
    colors: { primary: "#A4566B", secondary: "#F8ECEE", accent: "#D8A1A9", headerBackground: "#2B1D22", footerBackground: "#2B1D22", border: "#EBDDE0" },
  },
  {
    key: "emerald",
    label: { ar: "زمردي فاخر", en: "Emerald" },
    colors: { primary: "#0F5B4A", secondary: "#E8F1EE", accent: "#C9A961", headerBackground: "#0B2A23", footerBackground: "#0B2A23", border: "#D9E5E1" },
  },
  {
    key: "midnight",
    label: { ar: "كحلي ليلي", en: "Midnight" },
    colors: { primary: "#1D3557", secondary: "#EEF1F6", accent: "#C9A961", headerBackground: "#0E1A2B", footerBackground: "#0E1A2B", border: "#DDE2EA" },
  },
];
