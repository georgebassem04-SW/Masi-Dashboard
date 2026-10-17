/**
 * PAGE: /settings/staff/new — ADD STAFF MEMBER (design screen 14)
 * Form: components/settings/StaffForm.tsx (simple = ready-made role, advanced = per-section permissions).
 * Needs permission staff = edit.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NoAccess } from "@/components/common/NoticePage";
import { StaffForm } from "@/components/settings/StaffForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).settings.form.newTitle };
}

export default async function NewStaffPage() {
  const session = await requireStaff();
  if (!can(session, "staff", "edit")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/settings/staff" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {dict.settings.form.back}
        </Link>
        <h2 className="text-2xl font-bold">{dict.settings.form.newTitle}</h2>
      </div>
      <StaffForm
        member={null}
        // Only what the rules need — never the session token
        actor={{ staffId: session.staffId, role: session.role, permissions: session.permissions }}
        locale={locale}
        labels={dict.settings}
        roleNames={dict.roles}
      />
    </>
  );
}
