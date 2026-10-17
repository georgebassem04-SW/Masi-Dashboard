/**
 * PAGE: /pages — SITE PAGES LIST (design screen 15)
 * ------------------------------------------------------------------
 * About, Contact, FAQ, Terms (main pages) + any page the store adds (returns policy, privacy, buying guide…).
 *   [page · link · sections · in menu · last change · status · edit]      [+ New page]
 * Data: api.listPages(). The home page has its own editor (Home page).
 *   - Texts: dictionaries → "sitePages"
 * Needs permission "content" (view to see, edit to change).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatNumber, t } from "@/lib/format";
import { isShopPage, pagePath } from "@/lib/pages/paths";
import { cn } from "@/lib/utils";
import type { PageStatus } from "@/types";
import { NoAccess } from "@/components/common/NoticePage";
import { NewPageButton } from "@/components/pages/NewPageButton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.pages };
}

const TONE: Record<PageStatus, string> = {
  published: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  changed: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  draft: "bg-muted text-muted-foreground",
};

export default async function PagesPage() {
  const session = await requireStaff();
  if (!can(session, "content")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.sitePages;
  const pages = await api.listPages(session.token);
  const canEdit = can(session, "content", "edit");

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{d.hint}</p>
        {canEdit && <NewPageButton label={d.new} labels={{ newDialog: d.newDialog, menu: d.menu, errors: d.errors }} />}
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <table className="hidden w-full text-sm md:table">
          <thead className="bg-muted text-muted-foreground">
            <tr className="border-b">
              {[d.columns.page, d.columns.link, d.columns.sections, d.columns.menu, d.columns.updated, d.columns.status].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.slug} className="relative border-b last:border-0 hover:bg-[#fcfaf6]">
                <td className="px-4 py-3">
                  <Link href={`/pages/${encodeURIComponent(p.slug)}`} className="font-semibold after:absolute after:inset-0 hover:text-gold">
                    {t(p.title, locale) || p.slug}
                  </Link>
                  {/* "Top of: All products / Categories": their sections show at the top of that shop page */}
                  {isShopPage(p.slug) ? (
                    <span className="ms-2 rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-gold">{d.shopTopBadge}</span>
                  ) : (
                    p.system && <span className="ms-2 rounded bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-gold">{d.systemBadge}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">
                  {pagePath(p.slug)}
                </td>
                <td className="px-4 py-3">{formatNumber(p.sectionsCount, locale)}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.menu[p.menu]}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDateTime(p.updatedAt, locale)}
                  {p.updatedBy && <span className="block text-xs">{fill(d.by, { name: t(p.updatedBy, locale) })}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[p.status])}>{d.status[p.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Phones: cards */}
        <ul className="flex flex-col md:hidden">
          {pages.map((p) => (
            <li key={p.slug} className="border-b last:border-0">
              <Link href={`/pages/${encodeURIComponent(p.slug)}`} className="flex flex-col gap-1 px-4 py-3 active:bg-muted">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{t(p.title, locale) || p.slug}</span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[p.status])}>{d.status[p.status]}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  <span dir="ltr">{pagePath(p.slug)}</span> · {d.menu[p.menu]} · {formatDateTime(p.updatedAt, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
