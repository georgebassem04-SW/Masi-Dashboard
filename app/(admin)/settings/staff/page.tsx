/**
 * PAGE: /settings/staff — STAFF & PERMISSIONS (design screen 13, staff part)
 * Everyone who can log in: name, email, role (+ "custom permissions"), last login, status. "Add staff member".
 * Add / edit: /settings/staff/new and /settings/staff/<id> (components/settings/StaffForm.tsx).
 * Needs permission "staff" (view to see, edit to add / change).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, t } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NoAccess } from "@/components/common/NoticePage";
import { Card } from "@/components/settings/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).settings.tabs.staff };
}

export default async function StaffPage() {
  const session = await requireStaff();
  if (!can(session, "staff")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const L = dict.settings;
  const S = L.staff;
  const staff = await api.listStaff(session.token);
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const when = (iso?: string) => (iso ? new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : S.never);

  return (
    <Card
      title={L.tabs.staff}
      hint={`${S.hint} · ${fill(S.count, { n: new Intl.NumberFormat(intl).format(staff.length) })}`}
      action={
        can(session, "staff", "edit") && (
          <Link href="/settings/staff/new" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-semibold text-gold-foreground hover:opacity-90">
            <Plus className="size-4" />
            {S.add}
          </Link>
        )
      }
    >
      <ul className="flex flex-col divide-y rounded-lg border">
        {staff.map((m) => {
          const status = !m.active ? { text: S.inactive, tone: "bg-[#f6e0dc] text-destructive" } : m.mustChangePassword ? { text: S.mustChange, tone: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]" } : { text: S.active, tone: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]" };
          return (
            <li key={m.id}>
              <Link href={`/settings/staff/${encodeURIComponent(m.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 hover:bg-muted/50">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full font-bold", m.active ? "bg-[#eadfc8] text-[#5c4312]" : "bg-muted text-muted-foreground")}>{t(m.name, locale).charAt(0)}</span>
                <span className="flex min-w-0 flex-1 basis-48 flex-col">
                  <span className="font-semibold">
                    {t(m.name, locale)}
                    {m.id === session.staffId && <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{S.you}</span>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" dir="ltr">
                    {m.email}
                  </span>
                </span>
                <span className="flex basis-40 flex-col text-sm">
                  <span className="font-semibold">{dict.roles[m.role]}</span>
                  {m.permissions && m.role !== "owner" && <span className="text-xs text-gold">{S.custom}</span>}
                </span>
                <span className="basis-36 text-xs text-muted-foreground">
                  {S.columns.lastLogin}: {when(m.lastLoginAt)}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.tone)}>{status.text}</span>
                <ChevronLeft className="size-4 text-muted-foreground ltr:rotate-180" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
