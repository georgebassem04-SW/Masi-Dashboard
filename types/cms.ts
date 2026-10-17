/**
 * HOMEPAGE BLOCK TYPES — every kind of block the dashboard can put on the homepage.
 * Each block has: id, type, isActive (show/hide), sortOrder (position), data (its content).
 */
import type { LocalizedText, MediaImage, MediaVideo } from "./common";

/**
 * Homepage/CMS sections. The dashboard sends an ordered list of these;
 * the storefront renders them in that order (see components/sections/SectionRenderer.tsx).
 * To add a new section type: add it to this union, then register a component in the renderer.
 */
interface BaseSection {
  id: string;
  /** Lets the dashboard hide a section without deleting it */
  isActive: boolean;
  sortOrder: number;
}

export interface CtaLink {
  label: LocalizedText;
  href: string;
}

/** Look of one button on a hero. Empty colours = the site's own (filled: main colour · outline: the text colour) */
export interface HeroButtonStyle {
  variant: "filled" | "outline";
  /** Button colour (filled: its background · outline: its border). "" = automatic */
  color: string;
  /** Colour of the words on the button. "" = automatic */
  textColor: string;
}

/**
 * HOW A HERO IS LAID OUT — where the words and buttons sit on the picture, their colours, the shade over the picture.
 * Used by the slider slides ("hero") and by the page title banner ("page_hero").
 * Everything is optional when saved; missing values come from lib/hero-style.ts (= the original design).
 */
export interface HeroStyle {
  /** Switches: false = that part is hidden on the website (what was typed is kept, so it can be switched back on) */
  showTitle: boolean;
  showText: boolean;
  showButton1: boolean;
  showButton2: boolean;
  /** Where the words sit: across (start = reading-start side) and up / down */
  x: "start" | "center" | "end";
  y: "top" | "middle" | "bottom";
  /** Where the buttons sit: "text" = right under the words, "own" = their own place (bx / by) */
  buttons: "text" | "own";
  bx: "start" | "center" | "end";
  by: "top" | "middle" | "bottom";
  titleSize: "sm" | "md" | "lg";
  /** "" = white on a picture */
  titleColor: string;
  textColor: string;
  /** Shade over the picture so words stay readable: 0 (none) … 80 (%) */
  overlay: number;
  /** "" = black */
  overlayColor: string;
  /** Blur of the picture: 0 (sharp) … 20 (very soft). The words and buttons stay sharp */
  blur: number;
  button1: HeroButtonStyle;
  button2: HeroButtonStyle;
}
export type HeroStyleInput = Partial<Omit<HeroStyle, "button1" | "button2">> & { button1?: Partial<HeroButtonStyle>; button2?: Partial<HeroButtonStyle> };

export interface HeroSection extends BaseSection {
  type: "hero";
  data: {
    /** How tall the slider is: "md" = the original (wide picture), "lg" = taller, "full" = the whole screen. Missing = "md" */
    height?: "md" | "lg" | "full";
    /**
     * "classic" = big title, text and buttons where chosen (original)
     * "editorial" = quiet words at the bottom centre: the text in small spaced capitals (*stars* = italic words),
     *               the first button as a small word with a thin line under it ("DISCOVER"). The title is kept for search engines only.
     */
    look?: "classic" | "editorial";
    slides: {
      image: MediaImage;
      mobileImage?: MediaImage;
      /** Optional: a slide can be a picture only */
      title: LocalizedText;
      subtitle?: LocalizedText;
      cta?: CtaLink;
      /** Optional second button next to the first one (outlined), e.g. "Design your piece" → /custom-order */
      cta2?: CtaLink;
      /** Positions and colours of this slide (lib/hero-style.ts) */
      style?: HeroStyleInput;
    }[];
  };
}

export interface BannerSection extends BaseSection {
  type: "banner";
  data: { image: MediaImage; title?: LocalizedText; cta?: CtaLink };
}

export interface FeaturedProductsSection extends BaseSection {
  type: "featured_products";
  data: {
    title: LocalizedText;
    /** "featured" | "new" | "manual" (use productIds) | "category" (use categoryId) */
    source: "featured" | "new" | "manual" | "category";
    productIds?: string[];
    categoryId?: string;
    limit: number;
    /** "grid" = rows of cards (original) · "carousel" = one sideways row with ← → and tabs */
    layout?: "grid" | "carousel";
    /** Title look: "classic" = title on the side + "View all" · "centered" = small capitals in the middle */
    titleStyle?: "classic" | "centered";
    /** Carousel tabs after "All": each shows a category's products, or the products with a tag (e.g. "gold") */
    tabs?: { label: LocalizedText; categoryId?: string; tag?: string }[];
    /** Name of the first tab. Empty = "All" */
    allLabel?: LocalizedText;
  };
}

export interface CategoriesSection extends BaseSection {
  type: "categories";
  /**
   * align      = where the circles sit when they don't fill the row: start (default), center or end
   * titleAlign = where the title sits, on its own. Missing = the same side as the circles
   */
  data: {
    title: LocalizedText;
    /** Small line above the title */
    eyebrow?: LocalizedText;
    categoryIds?: string[];
    align?: "start" | "center" | "end";
    titleAlign?: "start" | "center" | "end";
    /** "circles" = round pictures with the name under them (original) · "tiles" = square pictures with the name on them */
    style?: "circles" | "tiles";
    /** Tiles only: stretch edge to edge with no gaps */
    fullWidth?: boolean;
  };
}

export interface BrandsSection extends BaseSection {
  type: "brands";
  data: {
    title: LocalizedText;
    brandIds?: string[];
    /** Position of the boxes in the row (start = right in Arabic / left in English) */
    align?: "start" | "center" | "end";
    /** Position of the title (nothing = same as the boxes) */
    titleAlign?: "start" | "center" | "end";
  };
}

export interface VideoSection extends BaseSection {
  type: "video";
  data: { title?: LocalizedText; video: MediaVideo };
}

export interface PromotionSection extends BaseSection {
  type: "promotion";
  data: {
    title: LocalizedText;
    description?: LocalizedText;
    image?: MediaImage;
    cta?: CtaLink;
    endsAt?: string;
  };
}

/** Jewelry-specific: today's gold prices strip */
export interface GoldPricesSection extends BaseSection {
  type: "gold_prices";
  data: { title: LocalizedText; karats: (24 | 22 | 21 | 18 | 14)[] };
}

/* ------------------------------------------------------------------
 * CONTENT-PAGE BLOCKS (About, FAQ, custom pages...)
 * These can also be used on the homepage. Texts marked "HTML" come from the
 * dashboard's rich-text editor and are cleaned before display (components/common/RichText.tsx).
 * ------------------------------------------------------------------ */

/** Page title banner at the top of a content page (with breadcrumb) */
export interface PageHeroSection extends BaseSection {
  type: "page_hero";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    image?: MediaImage;
    /** Optional buttons */
    cta?: CtaLink;
    cta2?: CtaLink;
    /** How tall the banner is (default "md") */
    height?: "sm" | "md" | "lg";
    /** "Home / Page" line above the title (default true) */
    breadcrumb?: boolean;
    /** Background colour when there is no picture. "" / missing = the site's soft colour */
    background?: string;
    /** Positions and colours (lib/hero-style.ts) */
    style?: HeroStyleInput;
  };
}

/** Text on one side, image on the other ("Our story") */
export interface ImageTextSection extends BaseSection {
  type: "image_text";
  data: {
    eyebrow?: LocalizedText; // small line above the title
    title: LocalizedText;
    body: LocalizedText; // HTML
    image: MediaImage;
    /** "start" = image on the reading-start side (left in English, right in Arabic) */
    imagePosition: "start" | "end";
    cta?: CtaLink;
    /**
     * "card" = picture and text with a gap (original) · "split" = picture and a framed text panel side by side, text centred
     * "editorial" = tall picture + quiet text: small grey line on top, big light title (*stars* = italic words), underlined link
     */
    layout?: "card" | "split" | "editorial";
  };
}

/** Big numbers: "30+ years", "5 branches" */
export interface StatsSection extends BaseSection {
  type: "stats";
  data: { title?: LocalizedText; items: { value: LocalizedText; label: LocalizedText }[] };
}

/** Grid of icon + title + text (values, why choose us, services) */
export type FeatureIcon =
  | "gem" | "shield" | "scale" | "sparkles" | "award" | "heart" | "truck" | "coins" | "wrench" | "badge";

export interface FeaturesSection extends BaseSection {
  type: "features";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    columns: 2 | 3 | 4;
    items: { icon: FeatureIcon; title: LocalizedText; text: LocalizedText }[];
  };
}

/** Company history by year */
export interface TimelineSection extends BaseSection {
  type: "timeline";
  data: { title: LocalizedText; items: { year: string; title: LocalizedText; text: LocalizedText }[] };
}

/** Free formatted text (mission, vision, policies) */
export interface RichTextSection extends BaseSection {
  type: "rich_text";
  data: { title?: LocalizedText; body: LocalizedText /* HTML */; width: "narrow" | "wide" };
}

/** Branch cards: address, hours, phone, map. Branch data comes from GET /storefront/branches */
export interface BranchesSection extends BaseSection {
  type: "branches";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    branchIds?: string[];
    /**
     * Where the branch cards sit in the row when they don't fill it (1–2 branches):
     * "start" = reading-start side (right in Arabic, left in English) · "center" · "end". Missing = "start"
     */
    align?: "start" | "center" | "end";
  };
}

/** Call-to-action strip with one or two buttons */
export interface CtaSection extends BaseSection {
  type: "cta";
  data: {
    title: LocalizedText;
    text?: LocalizedText;
    primary?: CtaLink;
    secondary?: CtaLink;
    background: "primary" | "secondary" | "image" | "video";
    image?: MediaImage;
    /** background "video": a video file playing silently behind the words (mp4 link) */
    video?: MediaVideo;
    /** Small line above the title */
    eyebrow?: LocalizedText;
    /** Where the words sit. Missing = "center" */
    align?: "start" | "center";
    /** How tall the strip is. Missing = "md" */
    height?: "sm" | "md" | "lg";
  };
}

/** "Follow us" strip: tall pictures (Instagram / TikTok posts) with the account name, each opening its post */
export interface SocialFeedSection extends BaseSection {
  type: "social_feed";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    /** Account name shown on each picture, e.g. "kinggoldeg" */
    handle: string;
    /** The account's page (opened by the button and by pictures that have no own link) */
    profileUrl: string;
    items: { image: MediaImage; href?: string }[];
    /** Button under the pictures, e.g. "Follow us" */
    button?: CtaLink;
    /** "posts" = tall posts with the account name (original) · "gallery" = plain pictures edge to edge, no account name */
    look?: "posts" | "gallery";
  };
}

/**
 * SPOTLIGHT: one big picture with words on it (small line, title, text, link) next to a few product cards.
 * Products: picked by hand (productIds) or the newest of a category.
 */
export interface ProductSpotlightSection extends BaseSection {
  type: "product_spotlight";
  data: {
    eyebrow?: LocalizedText;
    /** *stars* around words = italic accent words ("Signature *Pieces*") */
    title: LocalizedText;
    text?: LocalizedText;
    cta?: CtaLink;
    image: MediaImage;
    /** Picture on the reading-start side (left in English) or the end side */
    imagePosition: "start" | "end";
    source: "manual" | "category" | "featured" | "new";
    productIds?: string[];
    categoryId?: string;
    /** How many cards next to the picture (2 or 4) */
    limit: 2 | 4;
  };
}

/**
 * PLACES ON A PICTURE: a wide picture with a title on top and a row of places at the bottom
 * (e.g. "Visit us *in Cairo*": Heliopolis · New Cairo · Private appointments), each with a short text and a link.
 */
export interface LocationsSection extends BaseSection {
  type: "locations";
  data: {
    eyebrow?: LocalizedText;
    title: LocalizedText;
    image: MediaImage;
    items: { title: LocalizedText; text?: LocalizedText; link?: CtaLink }[];
    /** How tall: "md" ≈ 2/3 of the screen width, "lg" ≈ the whole screen */
    height?: "md" | "lg";
    /** Shade over the picture so the words stay readable: 0 … 80 (%) */
    overlay?: number;
  };
}

/**
 * Contact block: contact channels (phone, WhatsApp, email, address, hours) + the contact form.
 * Channel details come from the store settings (config/clients/<client>.ts, later GET /storefront/settings).
 */
export interface ContactSection extends BaseSection {
  type: "contact";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    /** Options of the "Subject" dropdown. "value" is what the dashboard receives, "label" is what the visitor sees */
    subjects: { value: string; label: LocalizedText }[];
    /** Message shown after a successful send */
    successMessage: LocalizedText;
    /** Show the contact channels card next to the form */
    showContactInfo: boolean;
    /** Show a "Preferred branch" dropdown (from GET /storefront/branches) */
    showBranchSelect: boolean;
  };
}

/**
 * "Design your piece" block: how-it-works steps + the custom-order form (customer photos + description).
 * Requests go to the dashboard → Customization requests. Piece types / karats / photo limits: storefront lib/validation/custom-request.ts
 */
export interface CustomOrderSection extends BaseSection {
  type: "custom_order";
  data: {
    title: LocalizedText;
    subtitle?: LocalizedText;
    /** "How it works" — short numbered steps shown above the form (can be empty) */
    steps: LocalizedText[];
    /** Message shown after a successful send */
    successMessage: LocalizedText;
    /** Show the "Preferred karat" and "Approximate budget" fields */
    showKarat: boolean;
    showBudget: boolean;
  };
}

/** Questions & answers shown as an accordion (FAQ page, shipping questions…) */
export interface FaqSection extends BaseSection {
  type: "faq";
  data: { title?: LocalizedText; items: { question: LocalizedText; answer: LocalizedText /* HTML */ }[] };
}

/** Every block the dashboard can place on the homepage OR any content page */
export type HomeSection =
  | HeroSection
  | BannerSection
  | FeaturedProductsSection
  | CategoriesSection
  | BrandsSection
  | VideoSection
  | PromotionSection
  | GoldPricesSection
  | PageHeroSection
  | ImageTextSection
  | StatsSection
  | FeaturesSection
  | TimelineSection
  | RichTextSection
  | BranchesSection
  | CtaSection
  | ContactSection
  | CustomOrderSection
  | FaqSection
  | SocialFeedSection
  | ProductSpotlightSection
  | LocationsSection;

/** Same thing, clearer name when used outside the homepage */
export type CmsSection = HomeSection;
export type HomeSectionType = HomeSection["type"];

export interface HomePage {
  sections: HomeSection[];
  /** Set only when the dashboard sent the unpublished draft for preview (Homepage → Preview) */
  isPreview?: boolean;
}

/**
 * A content page managed from the dashboard page editor (About, FAQ, Terms, custom pages).
 * GET /storefront/pages/:slug
 */
export interface ContentPage {
  slug: string;
  status: "published" | "draft";
  title: LocalizedText;
  seo?: { title?: LocalizedText; description?: LocalizedText; image?: MediaImage };
  sections: CmsSection[];
  updatedAt: string;
  /** Where the page link appears: top menu, footer, or nowhere (still reachable by its link) */
  menu?: "header" | "footer" | "none";
  /** Set only when the dashboard sent an unpublished draft for preview */
  isPreview?: boolean;
}

/** A page link for the menus. GET /storefront/pages?menu=1 */
export interface MenuPage {
  slug: string;
  title: LocalizedText;
  /** Where Site pages placed it. "none" = in no menu (it can still be picked for the top menu in Header → Menu links) */
  menu: "header" | "footer" | "none";
  /** Order inside its menu */
  sortOrder: number;
}

/** A physical shop. GET /storefront/branches */
export interface Branch {
  id: string;
  name: LocalizedText;
  city: LocalizedText;
  address: LocalizedText;
  phone: string;
  whatsapp?: string;
  hours: LocalizedText;
  mapUrl?: string;
  image?: MediaImage;
  isPickupPoint: boolean;
  sortOrder: number;
}
