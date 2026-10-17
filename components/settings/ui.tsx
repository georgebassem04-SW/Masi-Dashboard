/**
 * SMALL BUILDING BLOCKS for the Settings pages: card, field with label / hint / error, on-off switch, message line.
 */
"use client";

import { cn } from "@/lib/utils";

export const inputBox = "h-11 w-full rounded-lg border bg-card px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted";

export function Card({ title, hint, action, children, className }: { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm font-semibold", className)}>
      <span className={cn(error && "text-destructive")}>{label}</span>
      {children}
      {(error || hint) && <span className={cn("text-xs font-normal", error ? "text-destructive" : "text-muted-foreground")}>{error ?? hint}</span>}
    </label>
  );
}

/** Text box with a red border when `error` is set */
export function TextBox({ error, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string | null }) {
  return <input {...props} className={cn(inputBox, error ? "border-destructive" : "border-input", className)} />;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", checked ? "bg-gold" : "bg-input")}
    >
      <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} />
    </button>
  );
}

export function Message({ tone, children }: { tone: "ok" | "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-4 py-3 text-sm font-semibold",
        tone === "error" ? "bg-[#f6e0dc] text-destructive" : tone === "ok" ? "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]" : "bg-accent text-foreground",
      )}
    >
      {children}
    </p>
  );
}

/** PUT / POST / DELETE with JSON; answers { res, data } (res null = no connection) */
export async function send(path: string, method: string, body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
  return { res, data: res ? await res.json().catch(() => ({})) : {} };
}

/** [{ path, code }] from the API -> { "contact.email": "emailInvalid" } */
export const fieldErrors = (data: { issues?: { path: string; code: string }[] }) => Object.fromEntries((data.issues ?? []).map((i) => [i.path, i.code])) as Record<string, string>;
