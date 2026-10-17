/**
 * TOP BAR — white bar above every dashboard page:
 *   [☰ phones] [page title] ........ [search] [language] [🔔] [staff name + role → My account]
 *   - Title comes from the menu item that matches the address (config/nav.ts)
 *   - Search box: opens /orders?q=… (search by order no., customer name, phone or email)
 *   - Height: "h-18" below
 */
import Link from "next/link";
import type { Locale } from "@/types";
import { LanguageSwitch } from "./LanguageSwitch";
import { PageTitle } from "./PageTitle";

export function Topbar({
  locale,
  labels,
  navLabels,
  staffName,
  roleLabel,
  menu,
  bell,
}: {
  locale: Locale;
  labels: { searchPlaceholder: string; search: string; notifications: string; switchLanguage: string };
  navLabels: Record<string, string>;
  staffName: string;
  roleLabel: string;
  menu: React.ReactNode;
  bell: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-6 lg:h-18 lg:px-7">
      {menu}
      <PageTitle labels={navLabels} />
      {/* Quick search: opens the orders list filtered by the text (order no., name, phone, email) */}
      <form action="/orders" method="get" role="search" className="hidden xl:block">
        <input
          type="search"
          name="q"
          aria-label={labels.search}
          placeholder={labels.searchPlaceholder}
          className="h-11 w-72 rounded-lg border border-input bg-card px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </form>
      <LanguageSwitch label={labels.switchLanguage} target={locale === "ar" ? "en" : "ar"} className="hidden sm:block" />
      {/* Bell: unread count + latest notifications (components/notifications/NotificationBell.tsx) */}
      {bell}
      {/* Name + role -> My account (change password, what I can do) */}
      <Link href="/settings/account" className="hidden items-center gap-2.5 rounded-lg px-1 hover:bg-muted md:flex">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#eadfc8] font-bold text-[#5c4312]">{staffName.charAt(0)}</span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{staffName}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </div>
      </Link>
    </header>
  );
}
