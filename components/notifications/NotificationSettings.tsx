/**
 * WHAT TO NOTIFY ME ABOUT (Settings → My account) — a switch per kind (only kinds of sections this person may view).
 * Saves at once to PUT /api/notifications/preferences. Only affects the person themselves; the bell updates at once.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationType } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { NotificationIcon } from "./NotificationIcon";
import { NOTIFICATIONS_CHANGED } from "./NotificationBell";

export function NotificationSettings({ available, off: initialOff, labels: L }: { available: NotificationType[]; off: NotificationType[]; labels: Dictionary["notifications"] }) {
  const router = useRouter();
  const [off, setOff] = useState(initialOff);
  const [status, setStatus] = useState<null | "saved" | "error">(null);

  async function toggle(type: NotificationType, on: boolean) {
    const next = on ? off.filter((t) => t !== type) : [...off, type];
    setOff(next);
    setStatus(null);
    const res = await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ off: next }) }).catch(() => null);
    setStatus(res?.ok ? "saved" : "error");
    if (!res?.ok) setOff(off);
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); // the bell updates too
    router.refresh();
  }

  return (
    <section id="notifications" className="flex scroll-mt-24 flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{L.settings.title}</h2>
      <p className="text-sm text-muted-foreground">{L.settings.hint}</p>
      <ul className="flex flex-col divide-y">
        {available.map((t) => {
          const on = !off.includes(t);
          return (
            <li key={t} className="flex items-center gap-3 py-2.5">
              <NotificationIcon type={t} className="size-8" />
              <span className="flex-1 text-sm font-semibold">{L.names[t]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={L.names[t]}
                onClick={() => toggle(t, !on)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-input"}`}
              >
                <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${on ? "start-6" : "start-1"}`} />
              </button>
            </li>
          );
        })}
      </ul>
      {status && (
        <p role={status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${status === "error" ? "text-destructive" : "text-[var(--status-done-fg)]"}`}>
          {status === "error" ? L.failed : L.settings.saved}
        </p>
      )}
    </section>
  );
}
