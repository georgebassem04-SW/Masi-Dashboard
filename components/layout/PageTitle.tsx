/**
 * PAGE TITLE in the top bar — picks the name of the menu section that matches the address
 * (/orders/123 -> "الطلبات"). Section names: dictionaries → "nav".
 */
"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/nav";

export function PageTitle({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();
  const item =
    NAV_ITEMS
      .filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(`${i.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null;
  return <h1 className="min-w-0 flex-1 truncate text-xl font-bold lg:text-2xl">{item ? labels[item.key] : ""}</h1>;
}
