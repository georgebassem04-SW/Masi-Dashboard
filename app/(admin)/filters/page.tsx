/**
 * PAGE: /filters — PRODUCT FILTER (فلتر المنتجات) — the filter column of the website's product pages
 * ------------------------------------------------------------------
 * Which filter sections show (category, special offers, price, karat…), their order, and which categories are listed.
 * It edits the SAME theme as Theme & design (saved in theme.filters), so changes are a draft until "Publish".
 *   - Who can open it: permission "theme" ("view" = read-only)
 *   - The options: components/theme/FiltersPanel.tsx
 *   - Defaults and checks: lib/theme-chrome.ts · Texts: dictionaries → "theme.filters"
 *   - How the website uses them: storefront/components/catalog/FilterPanel.tsx
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
  return { title: (await getDictionary(await getLocale())).nav.filters };
}

export default async function FiltersPage() {
  const session = await requireStaff();
  if (!can(session, "theme")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [state, categories] = await Promise.all([api.getThemeState(session.token), api.listCategories(session.token)]);

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.theme.filters.subtitle}</p>
      <ThemeStudio
        section="filters"
        categories={categories.map((c) => ({ id: c.id, name: c.name[locale], isChild: !!c.parentId, visible: c.visible }))}
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
