/**
 * PAGE: /theme — THEME & DESIGN (المظهر والتصميم)
 * ------------------------------------------------------------------
 * Controls the whole look of the website: brand (name, logo, icons), every colour, fonts and text
 * sizes, shape & layout, and every fixed text. Changes are saved as a draft and go live on "Publish".
 *   - Who can open it: permission "theme" (owner, manager, website designer). "view" = read-only.
 *   - The editor itself: components/theme/ThemeStudio.tsx
 *   - Default values / font list / colour presets: config/theme-defaults.ts
 *   - Texts: dictionaries → "theme"
 */
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { ThemeStudio } from "@/components/theme/ThemeStudio";

export default async function ThemePage() {
  const session = await requireStaff();
  if (!can(session, "theme")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const state = await api.getThemeState(session.token);

  return (
    <div className="flex flex-col gap-2 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.theme.subtitle}</p>
      <ThemeStudio
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
