/**
 * PAGE: /footer — FOOTER (الفوتر) — the bottom of every page
 * ------------------------------------------------------------------
 * Every option of the footer: arrangement, parts and their order, logo, colours, links, contact lines, social icons, last line.
 * It edits the SAME theme as Theme & design (saved in theme.footer), so changes are a draft until "Publish".
 *   - Who can open it: permission "theme" ("view" = read-only)
 *   - The options: components/theme/FooterPanel.tsx · live sketch: components/theme/ChromePreview.tsx
 *   - Defaults and checks: lib/theme-chrome.ts · Texts: dictionaries → "theme.footer"
 *   - How the website uses them: storefront/components/layout/Footer.tsx
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
  return { title: (await getDictionary(await getLocale())).nav.footer };
}

export default async function FooterPage() {
  const session = await requireStaff();
  if (!can(session, "theme")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const state = await api.getThemeState(session.token);

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.theme.footer.subtitle}</p>
      <ThemeStudio
        section="footer"
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
