/**
 * PAGE: /product-page — PRODUCT PAGE (صفحة المنتج) — the page customers see when they open a product
 * ------------------------------------------------------------------
 * Which parts show (code, stock label, quantity, Buy now, WhatsApp, price breakdown, description, specifications,
 * related products), the side of the photos and which button is the main one.
 * It edits the SAME theme as Theme & design (saved in theme.productPage), so changes are a draft until "Publish".
 *   - Who can open it: permission "theme" ("view" = read-only)
 *   - The options: components/theme/ProductPagePanel.tsx
 *   - Defaults and checks: lib/theme-chrome.ts · Texts: dictionaries → "theme.productPage"
 *   - How the website uses them: storefront/app/[locale]/products/[slug]/page.tsx
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { ThemeStudio } from "@/components/theme/ThemeStudio";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.productPage };
}

export default async function ProductPageSettings() {
  const session = await requireStaff();
  if (!can(session, "theme")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const state = await api.getThemeState(session.token);

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.theme.productPage.subtitle}</p>
      <ThemeStudio
        section="productPage"
        initial={state}
        canEdit={can(session, "theme", "edit")}
        locale={locale}
        storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
        labels={dict.theme}
        mediaLabels={dict.media}
      />
    </div>
  );
}
