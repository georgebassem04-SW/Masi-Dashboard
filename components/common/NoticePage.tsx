/**
 * NOTICE PAGE — the centred message used for:
 *   - sections not built yet   (<ModulePlaceholder />)
 *   - pages without permission (<NoAccess />)
 *   - page not found           (app/not-found.tsx)
 */
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { findNavItem } from "@/config/nav";
import { Construction, Lock } from "lucide-react";

export function NoticePage({ icon: Icon, title, text, backLabel }: { icon: LucideIcon; title: string; text?: string; backLabel: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Icon className="size-7 text-gold" aria-hidden />
        </span>
        <h2 className="text-xl font-bold">{title}</h2>
        {text && <p className="leading-relaxed text-muted-foreground">{text}</p>}
        <Link href="/" className="mt-1 inline-flex h-11 items-center rounded-lg border border-input px-5 font-semibold hover:bg-muted">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

/** A dashboard section that will be built in a later step. Usage: <ModulePlaceholder navKey="orders" /> */
export async function ModulePlaceholder({ navKey }: { navKey: string }) {
  const dict = await getDictionary(await getLocale());
  const item = findNavItem(navKey);
  return <NoticePage icon={item?.icon ?? Construction} title={dict.placeholder.title} text={dict.placeholder.text} backLabel={dict.placeholder.back} />;
}

/** Shown when the staff member's role doesn't include this section */
export async function NoAccess() {
  const dict = await getDictionary(await getLocale());
  return <NoticePage icon={Lock} title={dict.noAccess.title} text={dict.noAccess.text} backLabel={dict.noAccess.back} />;
}
