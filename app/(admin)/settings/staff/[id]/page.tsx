/**
 * PAGE: /settings/staff/<id> — ONE STAFF MEMBER
 * Details, role / permissions (simple or advanced), can log in, last login;
 * new temporary password and delete at the bottom (not for yourself).
 * Form: components/settings/StaffForm.tsx · actions: StaffAccountActions.tsx. Needs permission "staff".
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, t } from "@/lib/format";
import { staffDeleteProblem } from "@/lib/staff/rules";
import { NoAccess, NoticePage } from "@/components/common/NoticePage";
import { Message } from "@/components/settings/ui";
import { StaffForm } from "@/components/settings/StaffForm";
import { StaffAccountActions } from "@/components/settings/StaffAccountActions";
import { AccessSummary } from "@/components/settings/AccessSummary";

export async function generateMetadata({ params }: PageProps<"/settings/staff/[id]">): Promise<Metadata> {
  const session = await requireStaff();
  const m = can(session, "staff") ? await api.getStaff(decodeURIComponent((await params).id), session.token) : null;
  const locale = await getLocale();
  return { title: m ? t(m.name, locale) : (await getDictionary(locale)).settings.tabs.staff };
}

export default async function StaffMemberPage({ params }: PageProps<"/settings/staff/[id]">) {
  const session = await requireStaff();
  if (!can(session, "staff")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const F = dict.settings.form;
  const member = await api.getStaff(decodeURIComponent((await params).id), session.token);
  if (!member) return <NoticePage icon={SearchX} title={dict.settings.errors.not_found} backLabel={F.back} />;
  const canEdit = can(session, "staff", "edit");
  const actor = { staffId: session.staffId, role: session.role, permissions: session.permissions };
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const when = (iso: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href="/settings/staff" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {F.back}
        </Link>
        <h2 className="text-2xl font-bold">{t(member.name, locale)}</h2>
        <span className="w-full text-xs text-muted-foreground sm:w-auto">
          {fill(F.lastLogin, { when: member.lastLoginAt ? when(member.lastLoginAt) : dict.settings.staff.never })}
          {member.createdBy && ` · ${fill(F.addedBy, { when: when(member.createdAt), name: t(member.createdBy, locale) })}`}
        </span>
      </div>
      {!canEdit && <Message tone="info">{dict.settings.common.viewOnly}</Message>}
      {canEdit ? (
        <StaffForm key={member.id} member={member} actor={actor} locale={locale} labels={dict.settings} roleNames={dict.roles} />
      ) : (
        <AccessSummary role={member.role} permissions={member.permissions} labels={dict.settings} roleName={dict.roles[member.role]} />
      )}
      {canEdit && !staffDeleteProblem(actor, member) && <StaffAccountActions id={member.id} name={t(member.name, locale)} labels={dict.settings} />}
    </>
  );
}

