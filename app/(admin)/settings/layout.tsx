/**
 * SETTINGS — shared top part of every settings page: the tabs.
 *   Store details  /settings/store     (permission "settings")
 *   Branches       /settings/branches  (permission "settings")
 *   Staff          /settings/staff     (permission "staff")
 *   My account     /settings/account   (everyone: own details + change password)
 * /settings itself opens the first tab the person may see (app/(admin)/settings/page.tsx).
 */
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  // passwordPage: someone on a temporary password can still reach My account
  const session = await requireStaff({ passwordPage: true });
  const T = (await getDictionary(await getLocale())).settings.tabs;
  const tabs = [
    can(session, "settings") && { href: "/settings/store", label: T.store },
    can(session, "settings") && { href: "/settings/branches", label: T.branches },
    can(session, "staff") && { href: "/settings/staff", label: T.staff },
    { href: "/settings/account", label: T.account },
  ].filter((t): t is { href: string; label: string } => !!t);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {!session.mustChangePassword && <SettingsTabs tabs={tabs} />}
      {children}
    </div>
  );
}
