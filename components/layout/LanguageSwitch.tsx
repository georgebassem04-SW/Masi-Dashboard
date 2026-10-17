/**
 * LANGUAGE BUTTON — "English" / "العربية". Posts to /api/locale, which saves the choice and
 * reloads the same page in the other language.
 */
"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ label, target, className }: { label: string; target: Locale; className?: string }) {
  const pathname = usePathname();
  return (
    <form action="/api/locale" method="post" className={className}>
      <input type="hidden" name="locale" value={target} />
      <input type="hidden" name="back" value={pathname} />
      <button type="submit" lang={target} className={cn("h-10 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted")}>
        {label}
      </button>
    </form>
  );
}
