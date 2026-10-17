/**
 * SETTINGS TABS — Store details · Branches · Staff & permissions · My account
 * Only the tabs the staff member may open are shown (see app/(admin)/settings/layout.tsx).
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SettingsTab {
  href: string;
  label: string;
}

export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const pathname = usePathname();
  // The most specific tab that matches the address (/settings/staff/12 -> Staff)
  const active = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;
  return (
    <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={active === t.href ? "page" : undefined}
              className={cn("flex h-10 items-center whitespace-nowrap rounded-md px-4 text-sm font-semibold", active === t.href ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
