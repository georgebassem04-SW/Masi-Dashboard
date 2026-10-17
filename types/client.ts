/**
 * CLIENT SETTINGS TYPE — the list of everything a client can customise.
 * Adding a new setting? Add it here first, then give it a value in every file in config/clients/.
 */
import type { Locale, LocalizedText } from "./common";

/**
 * Everything that differs between clients lives here.
 * One file per client in config/clients/. No component should hard-code a store name, colour or phone number.
 */
export interface ClientConfig {
  id: string;
  name: LocalizedText;
  tagline?: LocalizedText;

  locales: Locale[];
  defaultLocale: Locale;

  currency: string;
  /** VAT percentage applied at checkout, e.g. 14 (Egypt), 5 (UAE), 15 (KSA) */
  vatPercent: number;

  branding: {
    logo: string;
    logoDark?: string;
    favicon?: string;
  };

  theme: ThemeConfig;

  layout: {
    header: "centered" | "classic";
    productCard: "minimal" | "detailed";
    /** Product grid columns on desktop */
    gridColumns: 3 | 4;
  };

  /** Defaults — the dashboard's Settings → Store details replaces them (StoreSettings below) */
  contact: StoreContact;

  social?: StoreSettings["social"];

  features: {
    showGoldPrices: boolean;
    showWeight: boolean;
    storePickup: boolean;
    guestCheckout: boolean;
  };
}

export interface ThemeConfig {
  /** Colours as hex. They are converted to CSS variables and used by Tailwind + Shadcn. */
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    headerBackground: string;
    headerForeground: string;
    footerBackground: string;
    footerForeground: string;
  };
  /** Keys from lib/fonts.ts */
  fonts: {
    arabic: "cairo" | "tajawal" | "almarai";
    latin: "inter" | "playfair";
    headingLatin?: "inter" | "playfair";
  };
  radius: string;
}

export type SocialNetwork = "instagram" | "facebook" | "tiktok" | "x" | "youtube" | "snapchat";

export interface StoreContact {
  email: string;
  phone: string;
  whatsapp?: string;
  address?: LocalizedText;
  /** Customer-service hours, shown on the contact page */
  hours?: LocalizedText;
}

/**
 * Contact details and social links shown on the website (footer, contact page, header, order emails).
 * Edited in the dashboard → Settings → Store details. GET /storefront/settings
 */
export interface StoreSettings {
  contact: StoreContact;
  /** Only the networks with a link get an icon */
  social: Partial<Record<SocialNetwork, string>>;
  /** Website switches (dashboard → Settings → Store details → Website options). Missing = config/clients/<client>.ts → features */
  options?: Partial<SiteOptions>;
  /** Email that gets a copy of every new order. Empty = ORDERS_NOTIFY_EMAIL in the storefront's .env.local */
  ordersNotifyEmail?: string;
}

/** Website switches controlled from the dashboard */
export interface SiteOptions {
  /** Customers can order without creating an account */
  guestCheckout: boolean;
  /** Weight in grams on product cards, product page and cart */
  showWeight: boolean;
  /** "Today's gold prices" block on the website (when it's placed on the homepage) */
  showGoldPrices: boolean;
}
