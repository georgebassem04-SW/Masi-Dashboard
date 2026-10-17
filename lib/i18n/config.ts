/**
 * LANGUAGE (Arabic / English)
 * ------------------------------------------------------------------
 * Unlike the storefront, dashboard addresses have NO language in them (/orders, not /ar/orders).
 * The staff member's choice is saved in the cookie "admin_locale" (see app/api/locale/route.ts).
 *
 *   const locale = await getLocale();   // on the server: "ar" or "en"
 *   getDirection(locale)                // "rtl" or "ltr"
 */
import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "@/types";
import { storeConfig } from "@/config/store";

export const LOCALE_COOKIE = "admin_locale";
export const locales: Locale[] = ["ar", "en"];

export const isLocale = (v: unknown): v is Locale => v === "ar" || v === "en";

export const getDirection = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");

export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(saved) ? saved : storeConfig.defaultLocale;
}
