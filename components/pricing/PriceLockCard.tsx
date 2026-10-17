/**
 * PRICE LOCK CARD — how long checkout keeps the cart price, and how big a gold-price rise
 * is absorbed without asking the customer. Saves to PUT /api/pricing/settings.
 * Used by the storefront checkout (mock: lib/api/mock.ts → placeOrder; real API: the same rule).
 */
"use client";

import { useState } from "react";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { useRouter } from "next/navigation";
import type { PricingState } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type L = Dictionary["pricing"];

export function PriceLockCard({ state, canEdit, labels: L }: { state: PricingState; canEdit: boolean; labels: L }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(state.priceLockMinutes));
  const [tolerance, setTolerance] = useState(String(state.priceChangeTolerancePct));
  const [busy, setBusy] = useState(false);
  // UNDO / REDO for the two numbers
  const history = useUndoRedo({ minutes, tolerance }, (v) => {
    setMinutes(v.minutes);
    setTolerance(v.tolerance);
  });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save() {
    setBusy(true);
    setMessage(null);
    setErrors({});
    const res = await fetch("/api/pricing/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: state.source, priceLockMinutes: Number(minutes), priceChangeTolerancePct: Number(tolerance) }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      setMessage({ tone: "ok", text: L.lock.saved });
      router.refresh();
      return;
    }
    if (Array.isArray(data.issues)) setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }
  const err = (k: string) => (errors[k] ? L.errors[errors[k] as keyof L["errors"]] ?? L.errors.required : null);

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <h2 className="text-lg font-bold">{L.lock.title}</h2>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {L.lock.minutes}
        <input type="number" min={1} max={120} dir="ltr" disabled={!canEdit} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={cn("h-11 w-32 rounded-lg border bg-card px-3 font-normal disabled:bg-muted", err("priceLockMinutes") ? "border-destructive" : "border-input")} />
        <span className={cn("text-xs font-normal", err("priceLockMinutes") ? "text-destructive" : "text-muted-foreground")}>{err("priceLockMinutes") ?? L.lock.minutesHint}</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {L.lock.tolerance}
        <input type="number" min={0} max={5} step={0.1} dir="ltr" disabled={!canEdit} value={tolerance} onChange={(e) => setTolerance(e.target.value)} className={cn("h-11 w-32 rounded-lg border bg-card px-3 font-normal disabled:bg-muted", err("priceChangeTolerancePct") ? "border-destructive" : "border-input")} />
        <span className={cn("text-xs leading-relaxed font-normal", err("priceChangeTolerancePct") ? "text-destructive" : "text-muted-foreground")}>{err("priceChangeTolerancePct") ?? L.lock.toleranceHint}</span>
      </label>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("text-sm font-semibold", message.tone === "error" ? "text-destructive" : "text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}
      {canEdit && <UndoRedo history={history} disabled={busy} className="self-end" />}
      {canEdit && (
        <button type="button" onClick={save} disabled={busy} className="h-11 self-end rounded-lg border border-input bg-card px-5 text-sm font-semibold hover:bg-muted disabled:opacity-60">
          {L.lock.save}
        </button>
      )}
    </section>
  );
}
