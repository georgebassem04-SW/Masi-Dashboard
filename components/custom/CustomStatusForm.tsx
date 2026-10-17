/**
 * CHANGE STATUS — on an open customization request.
 * Pick the new status; when it's "Quote sent" the price box appears (kept with the request).
 * An optional note is saved in the history with the change. Sends POST /api/custom-requests/<id>/status.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CUSTOM_STATUSES, type CustomStatus } from "@/types";

interface Labels {
  title: string;
  status: string;
  quote: string;
  quoteHint: string;
  note: string;
  notePlaceholder: string;
  save: string;
  saved: string;
  error: string;
  statuses: Record<CustomStatus, string>;
}

export function CustomStatusForm({ id, status, quote, currency, labels: L }: { id: string; status: CustomStatus; quote?: number; currency: string; labels: Labels }) {
  const router = useRouter();
  const [next, setNext] = useState<CustomStatus>(status);
  const [price, setPrice] = useState(quote !== undefined ? String(quote) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"saved" | "error" | null>(null);
  const showPrice = next === "quoted" || quote !== undefined;
  const priceValue = price.trim() === "" ? undefined : Number(price);
  const priceBad = priceValue !== undefined && (!Number.isFinite(priceValue) || priceValue < 0);
  const changed = next !== status || note.trim() !== "" || priceValue !== quote;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!changed || priceBad) return;
    setBusy(true);
    setResult(null);
    const res = await fetch(`/api/custom-requests/${encodeURIComponent(id)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, note: note.trim() || undefined, quote: priceValue }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setNote("");
      setResult("saved");
      router.refresh();
    } else setResult("error");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <h3 className="font-bold">{L.title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* STATUS as buttons: one button per status, the chosen one is highlighted */}
<div className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
  {L.status}
  <div role="radiogroup" aria-label={L.status} className="flex flex-wrap gap-2">
    {CUSTOM_STATUSES.map((s) => (
      <button
        key={s}
        type="button"
        role="radio"
        aria-checked={next === s}
        onClick={() => setNext(s)}
        className={
          next === s
            ? "h-11 rounded-lg border border-gold bg-accent px-4 font-semibold"
            : "h-11 rounded-lg border border-input bg-card px-4 font-normal hover:bg-muted"
        }
      >
        {L.statuses[s]}
      </button>
    ))}
  </div>
</div>
        {showPrice && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {L.quote} ({currency})
            <input
              type="number"
              min={0}
              step="any"
              dir="ltr"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-invalid={priceBad}
              className="h-11 rounded-lg border border-input bg-card px-3 font-normal aria-[invalid=true]:border-destructive"
            />
            <span className="text-xs font-normal text-muted-foreground">{L.quoteHint}</span>
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {L.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder={L.notePlaceholder} className="rounded-lg border border-input bg-card px-3 py-2 font-normal" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !changed || priceBad} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {L.save}
        </button>
        {result === "saved" && <span role="status" className="text-sm text-[var(--status-done-fg)]">{L.saved}</span>}
        {result === "error" && <span role="alert" className="text-sm text-destructive">{L.error}</span>}
      </div>
    </form>
  );
}
