/**
 * SWITCH LANGUAGE — POST /api/locale  (form field: locale = "ar" | "en")
 * Saves the choice in the "admin_locale" cookie for a year, then reloads the same page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config";
import { safeNext } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const locale = form.get("locale");
  const back = safeNext(String(form.get("back") ?? "/"));
  const res = NextResponse.redirect(new URL(back, request.url), { status: 303 });
  if (isLocale(locale)) {
    res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}
