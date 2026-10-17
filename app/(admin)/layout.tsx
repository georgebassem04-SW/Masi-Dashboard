/**
 * DASHBOARD LAYOUT — wraps every page after login:  [sidebar] [top bar + page]
 * ------------------------------------------------------------------
 * 1) requireStaff(): not logged in (or cookie expired/faked) -> /login
 * 2) Builds the menu the staff member is allowed to see (config/nav.ts + permissions)
 * The "(admin)" folder name in brackets does NOT appear in the address — it just groups these pages.
 */
import { requireStaff } from "@/lib/auth/session";
import { hasAccess } from "@/lib/auth/permissions";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NAV_ITEMS } from "@/config/nav";
import { t } from "@/lib/format";
import { LogoutButton, Sidebar, SidebarBrand } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MobileNav } from "@/components/layout/MobileNav";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { UndoLabels } from "@/components/common/UndoRedo";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  // The pages themselves send someone with a temporary password to My account (see requireStaff)
  const session = await requireStaff({ passwordPage: true });
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const allowedKeys = NAV_ITEMS.filter((i) => !i.permission || hasAccess(session.permissions, i.permission)).map((i) => i.key);
  const navLabels: Record<string, string> = dict.nav;
  const groupLabels: Record<string, string> = dict.navGroups;

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        locale={locale}
        appTitle={dict.app.title}
        logoutLabel={dict.app.logout}
        allowedKeys={allowedKeys}
        labels={navLabels}
        groupLabels={groupLabels}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          locale={locale}
          labels={dict.app}
          navLabels={navLabels}
          staffName={t(session.name, locale)}
          roleLabel={dict.roles[session.role]}
          bell={<NotificationBell locale={locale} labels={dict.notifications} title={dict.app.notifications} />}
          menu={
            <MobileNav
              menuLabel={dict.app.menu}
              closeLabel={dict.app.close}
              allowedKeys={allowedKeys}
              labels={navLabels}
              groupLabels={groupLabels}
              brand={<SidebarBrand locale={locale} appTitle={dict.app.title} />}
              language={<LanguageSwitch label={dict.app.switchLanguage} target={locale === "ar" ? "en" : "ar"} />}
              logout={<LogoutButton label={dict.app.logout} />}
            />
          }
        />
        {/* UndoLabels: the "Undo" / "Redo" texts for the buttons in every edit form */}
        <main className="flex flex-1 flex-col">
          <UndoLabels labels={dict.history}>{children}</UndoLabels>
        </main>
      </div>
    </div>
  );
}
