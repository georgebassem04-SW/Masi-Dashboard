/**
 * NUMBER CARD on the overview — label, big number, small coloured note.
 * Clickable when `href` is given (only when the staff member can open that section).
 * tone: good = green, bad = red, info = blue, warn = amber
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

const toneClass = {
  good: "text-[var(--status-done-fg)]",
  bad: "text-[var(--status-cancel-fg)]",
  info: "text-[var(--status-new-fg)]",
  warn: "text-[var(--status-progress-fg)]",
};

export function StatCard({
  label,
  value,
  note,
  tone,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: keyof typeof toneClass;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold sm:text-3xl">{value}</span>
      {note && <span className={cn("text-xs", tone ? toneClass[tone] : "text-muted-foreground")}>{note}</span>}
    </>
  );
  const cls = "flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-4 sm:px-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-[#c9a961]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
