/**
 * STORE SETTINGS FOR THIS DASHBOARD COPY
 * ------------------------------------------------------------------
 * One dashboard copy per client (same as the storefront). Change these values for each client.
 * Later, most of these will come from the API (Settings page) — this file is the fallback.
 */
import type { LocalizedText } from "@/types";

export const storeConfig = {
  /** Client id — must match the storefront's NEXT_PUBLIC_CLIENT_ID */
  id: "masi",
  name: { ar: "ماسي", en: "MASI" } satisfies LocalizedText,
  /** Currency used for all amounts (ISO code) */
  currency: "EGP",
  /** Store time zone — reports count "today" and each day in this time zone (IANA name, e.g. "Asia/Riyadh", "Asia/Dubai") */
  timeZone: "Africa/Cairo",
  /** Language the dashboard opens in; staff can switch from the top bar */
  defaultLocale: "ar" as const,
  /** Staff are logged out after this many hours without logging in again */
  sessionHours: 8,
  /** Link to the live shop (for "view on website") */
  storefrontUrl: process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3010",
};
