/**
 * SHARED TYPES — basic building blocks used by all other types.
 * LocalizedText = { ar: "...", en: "..." } — every text the dashboard sends comes in both languages.
 */
export type Locale = "ar" | "en";

/** A text value provided by the dashboard in every supported language. */
export type LocalizedText = Record<Locale, string>;

/** ISO 4217 currency code, e.g. "EGP", "AED", "SAR", "QAR". */
export type CurrencyCode = string;

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface MediaImage {
  url: string;
  alt?: LocalizedText;
  width?: number;
  height?: number;
}

export interface MediaVideo {
  url: string;
  posterUrl?: string;
  /** "file" = mp4 hosted by the dashboard, "youtube" / "vimeo" = embed */
  provider: "file" | "youtube" | "vimeo";
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
