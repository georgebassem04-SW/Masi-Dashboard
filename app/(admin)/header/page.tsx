/**
 * PAGE: /header — HEADER (الهيدر) — the website's top bar
 * ------------------------------------------------------------------
 * Every option of the top bar: arrangement, logo, colours, menu links, icons, announcement strip.
 * It edits the SAME theme as Theme & design (saved in theme.header), so changes are a draft until "Publish".
 *   - Who can open it: permission "theme" ("view" = read-only)
 *   - The options: components/theme/HeaderPanel.tsx · live sketch: components/theme/ChromePreview.tsx
 *   - Defaults and checks: lib/theme-chrome.ts · Texts: dictionaries → "theme.header"
 *   - How the website uses them: storefront/components/layout/Header.tsx
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { ThemeStudio } from "@/components/theme/ThemeStudio";
import { isShopPage } from "@/lib/pages/paths";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.header };
}

export default async function HeaderPage() {
  const session = await requireStaff();
  if (!can(session, "theme")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [state, pages, categories] = await Promise.all([api.getThemeState(session.token), api.listPages(session.token), api.listCategories(session.token)]);

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.theme.header.subtitle}</p>
      <ThemeStudio
        section="header"
        // Pages the client can put in the top menu ("Top of: …" entries are not pages by themselves)
        pages={pages.filter((p) => !isShopPage(p.slug)).map((p) => ({ slug: p.slug, name: p.title[locale] || p.slug, live: p.status !== "draft", inHeader: p.menu === "header" }))}
        // Main categories, for "which categories the Shop drop-down lists"
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
