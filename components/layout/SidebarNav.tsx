/**
 * SIDEBAR LINKS — the grouped menu, with the current page highlighted (gold text on dark).
 * Used by the desktop sidebar and by the phone menu.
 * Which links appear is decided on the server (permissions) and passed in as `items`.
 * Colours: globals.css → --sidebar-*
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/utils";

export function SidebarNav({
  allowedKeys,
  labels,
  groupLabels,
  onNavigate,
}: {
  allowedKeys: string[];
  labels: Record<string, string>;
  groupLabels: Record<string, string>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_GROUPS.map((group) => {
        const items = NAV_ITEMS.filter((i) => i.group === group && allowedKeys.includes(i.key));
        if (!items.length) return null;
        return (
          <div key={group} className="flex flex-col gap-0.5">
            <span className="px-3.5 pt-3.5 pb-1 text-xs text-sidebar-muted">{groupLabels[group]}</span>
            {items.map(({ key, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-lg px-3.5 text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-white",
                    active && "bg-sidebar-active font-semibold text-sidebar-active-foreground hover:bg-sidebar-active hover:text-sidebar-active-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden />
                  {labels[key]}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
