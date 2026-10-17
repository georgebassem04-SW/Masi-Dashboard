/**
 * NOTIFICATIONS — the bell in the top bar and its drop-down list (there is no separate page).
 *   - Red badge = unread count. Click the bell: the list opens under it
 *   - All / Unread · grouped Today / Yesterday / Earlier · "Show more" loads older ones inside the list
 *   - Click a notification: it's marked read and its page opens (order, message, product…)
 *   - "Mark all as read" · a dot per row to mark one read · link to the notification settings (Settings → My account)
 * Checks for new ones every BELL_REFRESH_SECONDS (config/notifications.ts), on page change and when you come back to the tab.
 * Data: GET /api/notifications · POST /api/notifications/read
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, Settings2 } from "lucide-react";
import type { AdminNotification, Locale } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { BELL_REFRESH_SECONDS } from "@/config/notifications";
import { dayGroup, notificationText, timeAgo } from "@/lib/notifications/text";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NotificationIcon } from "./NotificationIcon";

/** How many load at a time ("Show more" adds this many) */
const PAGE_SIZE = 15;
/** Browser event sent after a change elsewhere (e.g. the settings switches), so the bell updates at once */
export const NOTIFICATIONS_CHANGED = "notifications:changed";

export function NotificationBell({ locale, labels: L, title }: { locale: Locale; labels: Dictionary["notifications"]; title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const num = (n: number) => (n > 99 ? "99+" : new Intl.NumberFormat(intl).format(n));

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/notifications?filter=${filter}&page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store" }).catch(() => null);
    setLoading(false);
    if (!res?.ok) return;
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setUnread(data.unread);
  }, [filter, page]);

  // On every page change, every minute, when coming back to the tab, and after changes elsewhere
  useEffect(() => {
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), BELL_REFRESH_SECONDS * 1000);
    const again = () => void load();
    window.addEventListener("focus", again);
    window.addEventListener(NOTIFICATIONS_CHANGED, again);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", again);
      window.removeEventListener(NOTIFICATIONS_CHANGED, again);
    };
  }, [load, pathname]);

  // Close on a click outside, on Escape, and when another page opens
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  async function markRead(body: { ids: string[] } | { all: true }) {
    setError(false);
    // Show it at once, then confirm with the server
    if ("all" in body) {
      setItems((list) => (filter === "unread" ? [] : list.map((n) => ({ ...n, read: true }))));
      setUnread(0);
    } else {
      setItems((list) => list.map((n) => (body.ids.includes(n.id) ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - body.ids.length));
    }
    const res = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) setError(true);
    void load();
  }

  const groups = (["today", "yesterday", "earlier"] as const).map((g) => ({ g, list: items.filter((n) => dayGroup(n.createdAt) === g) })).filter((x) => x.list.length);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread ? `${title} — ${fill(L.unreadCount, { n: num(unread) })}` : title}
        className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-lg border border-input hover:bg-muted", open && "bg-muted")}
      >
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">{num(unread)}</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title}
          // Opens under the bell. Phones: almost full width; larger screens: 400px wide
          className="fixed inset-x-3 top-16 z-50 flex max-h-[min(80dvh,640px)] flex-col overflow-hidden rounded-xl border bg-card shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-[calc(100%+8px)] sm:w-[400px]"
        >
          {/* Header: title, mark all, All / Unread */}
          <div className="flex flex-col gap-2.5 border-b px-4 pt-3 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">
                {title}
                {unread > 0 && <span className="ms-2 rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-bold text-white">{num(unread)}</span>}
              </span>
              {unread > 0 && (
                <button type="button" onClick={() => markRead({ all: true })} className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline">
                  <Check className="size-3.5" />
                  {L.markAll}
                </button>
              )}
            </div>
            <div role="radiogroup" aria-label={title} className="flex gap-1 self-start rounded-lg bg-muted p-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={filter === f}
                  onClick={() => {
                    setFilter(f);
                    setPage(1);
                  }}
                  className={cn("h-8 rounded-md px-3 text-xs font-semibold", filter === f ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  {L[f]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {error && (
              <p role="alert" className="m-3 rounded-lg bg-[#f6e0dc] px-3 py-2 text-xs font-semibold text-destructive">
                {L.failed}
              </p>
            )}
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{loading ? "…" : filter === "unread" ? L.emptyUnread : L.empty}</p>
            ) : (
              groups.map(({ g, list }) => (
                <section key={g}>
                  <h3 className="sticky top-0 z-10 bg-card/95 px-4 pt-2.5 pb-1 text-xs font-bold text-muted-foreground backdrop-blur">{L[g]}</h3>
                  <ul>
                    {list.map((n) => (
                      <li key={n.id} className={cn("flex items-start gap-1 border-b last:border-0", !n.read && "bg-[#fdf9f0]")}>
                        <Link
                          href={n.href}
                          onClick={() => {
                            setOpen(false);
                            if (!n.read) void markRead({ ids: [n.id] });
                          }}
                          className="flex min-w-0 flex-1 gap-3 py-3 ps-4 hover:bg-muted/50"
                        >
                          <NotificationIcon type={n.type} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={cn("text-sm leading-snug", !n.read && "font-semibold")}>{notificationText(n, locale, L)}</span>
                            <span className="text-xs text-muted-foreground">
                              {L.names[n.type]} · {timeAgo(n.createdAt, locale, L)}
                            </span>
                          </span>
                        </Link>
                        {/* Unread dot = "Mark as read" */}
                        <span className="flex w-10 shrink-0 justify-center pt-3">
                          {!n.read && (
                            <button type="button" onClick={() => markRead({ ids: [n.id] })} aria-label={`${L.markRead}: ${notificationText(n, locale, L)}`} title={L.markRead} className="flex size-7 items-center justify-center rounded-full hover:bg-muted">
                              <span className="size-2.5 rounded-full bg-gold" />
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
            {items.length < total && (
              <div className="flex justify-center p-3">
                <button type="button" disabled={loading} onClick={() => setPage((p) => p + 1)} className="h-9 rounded-lg border border-input px-4 text-xs font-semibold hover:bg-muted disabled:opacity-60">
                  {loading ? "…" : L.more}
                </button>
              </div>
            )}
          </div>

          {/* Footer: settings live in each person's My account */}
          <Link href="/settings/account#notifications" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 border-t px-4 py-3 text-sm font-semibold text-gold hover:bg-muted/60">
            <Settings2 className="size-4" />
            {L.settings.title}
          </Link>
        </div>
      )}
    </div>
  );
}
