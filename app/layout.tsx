/**
 * ROOT LAYOUT — wraps every page (login pages and the dashboard).
 * Sets the language and direction (Arabic = right-to-left) from the staff member's saved choice,
 * and loads the fonts (lib/fonts.ts).
 */
import type { Metadata } from "next";
import "./globals.css";
import { fontClassNames } from "@/lib/fonts";
import { getDirection, getLocale } from "@/lib/i18n/config";
import { storeConfig } from "@/config/store";
import { t } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: { default: t(storeConfig.name, locale), template: `%s · ${t(storeConfig.name, locale)}` },
    // The dashboard must never appear in Google
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={getDirection(locale)} className={fontClassNames}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
