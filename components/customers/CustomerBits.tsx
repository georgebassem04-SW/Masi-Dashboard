/**
 * SMALL CUSTOMER PIECES used by the list and the customer file:
 *   <CustomerAvatar name="ريم الدوسري" />   round badge with the first letter (or the Google photo)
 *   <KindBadge … />                         "حساب · Google" / "زائر" / "موقوف"
 */
import type { CustomerSummary } from "@/types";
import { cn } from "@/lib/utils";

export function CustomerAvatar({ name, url, size = "md" }: { name: string; url?: string; size?: "md" | "lg" }) {
  const cls = cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-gold", size === "lg" ? "size-14 text-xl" : "size-9 text-sm");
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" className={cn(cls, "object-cover")} />;
  }
  return (
    <span className={cls} aria-hidden>
      {name.trim().charAt(0) || "؟"}
    </span>
  );
}

export function KindBadge({
  customer,
  labels,
}: {
  customer: Pick<CustomerSummary, "kind" | "signInWith" | "disabled">;
  labels: { kind: Record<string, string>; signIn: Record<string, string>; disabledBadge: string };
}) {
  const pill = "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (customer.disabled) return <span className={cn(pill, "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]")}>{labels.disabledBadge}</span>;
  if (customer.kind === "guest") return <span className={cn(pill, "bg-muted text-muted-foreground")}>{labels.kind.guest}</span>;
  return (
    <span className={cn(pill, "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]")}>
      {labels.kind.registered}
      {customer.signInWith.includes("google") && " · Google"}
    </span>
  );
}
