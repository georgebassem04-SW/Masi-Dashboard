/**
 * FORMATTING HELPERS
 *   t(text, locale)        -> Arabic or English version of a { ar, en } text
 *   formatMoney(...)       -> "٧٤٬٨٠٠ ج.م." in Arabic, "EGP 74,800" in English
 *   formatNumber(...)      -> 1,234 with the right digits for the language
 *   formatDateTime(...)    -> "اليوم 10:24" / "أمس 18:05" / "24 سبتمبر"
 *   formatDate(...)        -> "24 سبتمبر 2026" (style "month": "سبتمبر 2026")
 *   fill(template, vals)   -> fills {placeholders} in dictionary texts
 *   toLocalized(value)     -> makes sure a name is { ar, en } (a plain string is used for both)
 * Western digits (123) in Arabic: change "ar-EG" to "ar-EG-u-nu-latn" in intlLocale below.
 */
import type { Locale, LocalizedText } from "@/types";

export const t = (text: LocalizedText | undefined, locale: Locale): string =>
  text ? text[locale] || text.ar || text.en || "" : "";

/** Accepts "text" or { ar, en } and always returns { ar, en } (for data that may come in either shape) */
export const toLocalized = (value: unknown): LocalizedText => {
  if (typeof value === "string") return { ar: value, en: value };
  const v = (value ?? {}) as Partial<LocalizedText>;
  return { ar: v.ar ?? v.en ?? "", en: v.en ?? v.ar ?? "" };
};

const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-EG" : "en-US");

export const formatMoney = (amount: number, currency: string, locale: Locale): string =>
  new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export const formatNumber = (n: number, locale: Locale): string => new Intl.NumberFormat(intlLocale(locale)).format(n);

export function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const time = new Intl.DateTimeFormat(intlLocale(locale), { hour: "2-digit", minute: "2-digit" }).format(d);
  const yesterday = new Date(now.getTime() - 86400_000);
  if (d.toDateString() === now.toDateString()) return `${locale === "ar" ? "اليوم" : "Today"} ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `${locale === "ar" ? "أمس" : "Yesterday"} ${time}`;
  return new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long" }).format(d);
}

export const formatDate = (iso: string, locale: Locale, style: "day" | "month" = "day"): string =>
  new Intl.DateTimeFormat(intlLocale(locale), style === "month" ? { month: "long", year: "numeric" } : { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
