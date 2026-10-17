/**
 * PHONE / TABLET MENU — the ☰ button in the top bar opens the sidebar as a sliding panel.
 * Same links as the desktop sidebar. Closes when a link is tapped.
 */
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./SidebarNav";

export function MobileNav({
  menuLabel,
  closeLabel,
  allowedKeys,
  labels,
  groupLabels,
  brand,
  language,
  logout,
}: {
  menuLabel: string;
  closeLabel: string;
  allowedKeys: string[];
  labels: Record<string, string>;
  groupLabels: Record<string, string>;
  brand: React.ReactNode;
  /** Language button (the top bar hides it on phones, so it lives here) */
  language: React.ReactNode;
  logout: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label={menuLabel} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted lg:hidden">
        <Menu className="size-6" />
      </SheetTrigger>
      <SheetContent side="start" closeLabel={closeLabel} className="gap-1 overflow-y-auto border-0 bg-sidebar px-3.5 py-5 text-white [&>button]:text-white">
        <SheetTitle className="sr-only">{menuLabel}</SheetTitle>
        {brand}
        <SidebarNav allowedKeys={allowedKeys} labels={labels} groupLabels={groupLabels} onNavigate={() => setOpen(false)} />
        <div className="flex-1" />
        <div className="px-3.5 py-2 sm:hidden [&_button]:border-sidebar-active [&_button]:bg-transparent [&_button]:text-white">{language}</div>
        {logout}
      </SheetContent>
    </Sheet>
  );
}
