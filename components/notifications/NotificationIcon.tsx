/** Round icon of a notification kind (icons and colours: config/notifications.ts) */
import type { NotificationType } from "@/types";
import { kindOf } from "@/config/notifications";
import { cn } from "@/lib/utils";

const TONES = {
  gold: "bg-[#faf3e4] text-[#8a6420]",
  blue: "bg-[#e3edf7] text-[#2d5f8f]",
  red: "bg-[#f6e0dc] text-destructive",
  green: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  gray: "bg-muted text-muted-foreground",
};

export function NotificationIcon({ type, className }: { type: NotificationType; className?: string }) {
  const k = kindOf(type);
  const Icon = k.icon;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONES[k.tone], className)}>
      <Icon className="size-4" aria-hidden />
    </span>
  );
}
