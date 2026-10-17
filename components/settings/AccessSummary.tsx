/**
 * ACCESS SUMMARY — read-only list "what this person can do" (My account, and staff pages for view-only staff).
 */
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { PERMISSION_KEYS, type Permissions, type Role } from "@/lib/auth/permissions";
import { effectivePermissions } from "@/lib/staff/rules";
import { cn } from "@/lib/utils";

export function AccessSummary({ role, permissions, roleName, labels: L, title }: { role: Role; permissions?: Permissions; roleName: string; labels: Dictionary["settings"]; title?: string }) {
  const p = effectivePermissions({ role, permissions });
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">
        {title ?? L.form.access} <span className="text-sm font-normal text-muted-foreground">· {roleName}</span>
      </h2>
      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {PERMISSION_KEYS.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 border-b py-1.5 text-sm last:border-0">
            <span>{L.permissions[k].name}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                p[k] === "edit" ? "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]" : p[k] === "view" ? "bg-accent" : "bg-muted text-muted-foreground",
              )}
            >
              {L.form.levels[p[k]]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
