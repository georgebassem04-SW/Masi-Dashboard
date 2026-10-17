/**
 * QUICK ACTIONS — shortcut buttons on the overview. Buttons the staff member can't use are left out
 * (the page passes `false` for them). Hidden completely when none are left.
 */
import Link from "next/link";
import { Card } from "@/components/common/Card";
import { cn } from "@/lib/utils";

type Action = { href: string; label: string; primary?: boolean };

export function QuickActions({ title, actions }: { title: string; actions: (Action | false)[] }) {
  const list = actions.filter(Boolean) as Action[];
  if (!list.length) return null;
  return (
    <Card title={title}>
      <div className="flex flex-col gap-2.5 px-5 pb-5">
        {list.map((a) => (
          <Link
            key={a.href + a.label}
            href={a.href}
            className={cn(
              "flex h-11 items-center justify-center rounded-lg font-semibold transition-colors",
              a.primary ? "bg-primary text-primary-foreground hover:bg-sidebar-active" : "border border-input bg-card hover:bg-muted",
            )}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
