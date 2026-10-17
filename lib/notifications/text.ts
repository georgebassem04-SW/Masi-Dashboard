/**
 * NOTIFICATION TEXT — turns a notification into its sentence in the dashboard's language
 * (templates: dictionaries → notifications.types) and "5 min ago" style times.
 * Used by the bell and the Notifications page (browser side).
 */
import type { AdminNotification, Locale } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { subjectLabel } from "@/config/contact-subjects";
import { fill } from "@/lib/format";

type L = Dictionary["notifications"];

export function notificationText(n: AdminNotification, locale: Locale, L: L): string {
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const num = (v: number) => new Intl.NumberFormat(intl).format(v);
  const money = (v: number, currency = "EGP") => new Intl.NumberFormat(intl, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  const p = n.params;
  const values: Record<string, string | number> = { ...p };
  if (typeof p.total === "number") values.total = money(p.total, String(p.currency ?? "EGP"));
  if (typeof p.from === "number") values.from = money(p.from);
  if (typeof p.to === "number") values.to = money(p.to);
  for (const k of ["qty", "hours", "karat"]) if (typeof p[k] === "number") values[k] = num(p[k] as number);
  if (n.type === "new_message") values.subject = subjectLabel(String(p.subject))[locale];
  if (n.type === "new_custom") values.type = L.pieces[String(p.type) as keyof L["pieces"]] ?? String(p.type);
  if ((n.type === "low_stock" || n.type === "out_of_stock") && locale === "en" && p.nameEn) values.name = p.nameEn;
  return fill(L.types[n.type], values);
}

/** "Just now", "12 min ago", "3 h ago", then the time / date */
export function timeAgo(iso: string, locale: Locale, L: L, now = Date.now()): string {
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const mins = Math.floor((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return L.justNow;
  if (mins < 60) return fill(L.minutesAgo, { n: new Intl.NumberFormat(intl).format(mins) });
  if (mins < 24 * 60) return fill(L.hoursAgo, { n: new Intl.NumberFormat(intl).format(Math.floor(mins / 60)) });
  return new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** "Today" / "Yesterday" / "Earlier" — groups on the Notifications page */
export function dayGroup(iso: string, now = new Date()): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return d.getTime() >= start ? "today" : d.getTime() >= start - 86400_000 ? "yesterday" : "earlier";
}
