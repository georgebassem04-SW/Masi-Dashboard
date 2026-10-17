/**
 * ORDER ACTION BUTTONS — the next steps for this order ("تأكيد الطلب", "بدء التجهيز", …).
 * Only valid next steps are shown (lib/orders/workflow.ts). After a change the page reloads its data.
 *   - Cancel / return  -> asks for a reason (saved in the order history)
 *   - Shipped          -> asks for the courier tracking number (optional)
 *   - Other steps      -> one click
 * Sends to POST /api/orders/<id>/status (the server checks the rules and the permission again).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fill } from "@/lib/format";

type Labels = {
  actions: Record<string, string>;
  dialog: Record<string, string>;
  errors: Record<string, string>;
};

export function OrderActions({ orderId, orderNumber, next, labels }: { orderId: string; orderNumber: string; next: OrderStatus[]; labels: Labels }) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");

  async function send(status: OrderStatus, extra: { note?: string; trackingNumber?: string } = {}) {
    setBusy(status);
    setError(null);
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (res?.ok) {
      setDialog(null);
      setNote("");
      setTracking("");
      router.refresh();
    } else {
      setError(labels.errors[data.error] ?? (res?.status === 403 ? labels.errors.forbidden : labels.errors.failed));
    }
  }

  function click(status: OrderStatus) {
    if (status === "cancelled" || status === "returned" || status === "shipped") setDialog(status);
    else void send(status);
  }

  const dangerous = (s: OrderStatus) => s === "cancelled" || s === "returned";
  const forward = next.filter((s) => !dangerous(s));
  const back = next.filter(dangerous);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {forward.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={!!busy}
            onClick={() => click(s)}
            className={cn(
              "h-11 rounded-lg px-5 font-semibold disabled:opacity-60",
              i === 0 ? "bg-gold text-gold-foreground hover:opacity-90" : "border border-input bg-card hover:bg-muted",
            )}
          >
            {busy === s ? labels.dialog.working : labels.actions[s]}
          </button>
        ))}
        {back.map((s) => (
          <button
            key={s}
            type="button"
            disabled={!!busy}
            onClick={() => click(s)}
            className="h-11 rounded-lg px-4 font-semibold text-destructive hover:bg-[#f6e0dc] disabled:opacity-60"
          >
            {labels.actions[s]}
          </button>
        ))}
      </div>
      {error && !dialog && (
        <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent closeLabel={labels.dialog.close}>
          <DialogTitle>
            {fill(dialog === "shipped" ? labels.dialog.shipTitle : dialog === "returned" ? labels.dialog.returnTitle : labels.dialog.cancelTitle, { number: orderNumber })}
          </DialogTitle>
          <DialogDescription className="sr-only">{labels.actions[dialog ?? "cancelled"]}</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!dialog) return;
              if (dialog === "shipped") void send(dialog, { trackingNumber: tracking.trim() || undefined });
              else if (!note.trim()) setError(labels.errors.reason_required);
              else void send(dialog, { note: note.trim() });
            }}
            className="flex flex-col gap-4"
          >
            {dialog === "shipped" ? (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {labels.dialog.trackingLabel}
                <input dir="ltr" value={tracking} maxLength={60} onChange={(e) => setTracking(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3 font-normal" />
              </label>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {labels.dialog.reason}
                <textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} rows={3} className="rounded-lg border border-input bg-card px-3 py-2 font-normal" />
              </label>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                {labels.dialog.close}
              </button>
              <button
                type="submit"
                disabled={!!busy}
                className={cn("h-11 rounded-lg px-5 font-semibold text-white disabled:opacity-60", dialog === "shipped" ? "bg-gold" : "bg-destructive")}
              >
                {busy ? labels.dialog.working : labels.dialog.confirm}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
