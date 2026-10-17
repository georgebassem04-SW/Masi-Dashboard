/**
 * SIDEBAR — the dark menu on the start side (right in Arabic), visible on large screens.
 * On phones/tablets the same menu opens from the ☰ button (MobileNav.tsx).
 *   - Menu items / order / icons -> config/nav.ts
 *   - Texts                     -> dictionaries → "nav", "navGroups"
 *   - Width                     -> "w-62" below
 */
import { LogOut } from "lucide-react";
import type { Locale } from "@/types";
import { storeConfig } from "@/config/store";
import { t } from "@/lib/format";
import { SidebarNav } from "./SidebarNav";

export interface SidebarProps {
  locale: Locale;
  appTitle: string;
  logoutLabel: string;
  allowedKeys: string[];
  labels: Record<string, string>;
  groupLabels: Record<string, string>;
}

export function SidebarBrand({ locale, appTitle }: { locale: Locale; appTitle: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2.5 pt-1 pb-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold font-heading text-lg font-bold text-gold-foreground">
        {t(storeConfig.name, locale).charAt(0)}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold text-white">{appTitle}</span>
        <span className="truncate text-xs text-sidebar-muted">{t(storeConfig.name, locale)}</span>
      </div>
    </div>
  );
}

export function LogoutButton({ label }: { label: string }) {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3.5 text-[15px] text-sidebar-foreground hover:bg-sidebar-hover hover:text-white"
      >
        <LogOut className="size-[18px] rtl:-scale-x-100" aria-hidden />
        {label}
      </button>
    </form>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-1 overflow-y-auto bg-sidebar px-3.5 py-5 lg:flex">
      <SidebarBrand locale={props.locale} appTitle={props.appTitle} />
      <SidebarNav allowedKeys={props.allowedKeys} labels={props.labels} groupLabels={props.groupLabels} />
      <div className="flex-1" />
      <LogoutButton label={props.logoutLabel} />
    </aside>
  );
}
