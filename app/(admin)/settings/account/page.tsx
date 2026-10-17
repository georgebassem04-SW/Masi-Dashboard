/**
 * PAGE: /settings/account — MY ACCOUNT (every staff member)
 * My details (name, email, role), change password, notification settings (#notifications — the bell links here), what I can do.
 * ?first=1 = logged in with a temporary password: only the password form is shown until it's changed.
 */
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { t } from "@/lib/format";
import { Message } from "@/components/settings/ui";
import { AccessSummary } from "@/components/settings/AccessSummary";
import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { api } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).settings.tabs.account };
}

export default async function AccountPage() {
  const session = await requireStaff({ passwordPage: true });
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const A = dict.settings.account;
  const first = !!session.mustChangePassword;
  // Only the kinds this person can get, and the ones they switched off
  const notif = first ? null : await api.listNotifications(session.staffId, session.permissions, { pageSize: 1 }, session.token);

  return (
    <>
      {first && <Message tone="info">{A.first}</Message>}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ChangePasswordForm first={first} labels={dict.settings} />
        {!first && (
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <h2 className="text-lg font-bold">{A.details}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{dict.settings.form.nameAr.replace(/ \(.*\)/, "")}</dt>
              <dd className="font-semibold">{t(session.name, locale)}</dd>
              <dt className="text-muted-foreground">{dict.settings.form.email}</dt>
              <dd className="font-semibold">
                <span dir="ltr">{session.email}</span>
              </dd>
              <dt className="text-muted-foreground">{A.role}</dt>
              <dd className="font-semibold">{dict.roles[session.role]}</dd>
            </dl>
          </section>
        )}
      </div>
      {notif && notif.available.length > 0 && <NotificationSettings available={notif.available} off={notif.off} labels={dict.notifications} />}
      {!first && <AccessSummary role={session.role} permissions={session.permissions} labels={dict.settings} roleName={dict.roles[session.role]} title={A.myAccess} />}
    </>
  );
}
