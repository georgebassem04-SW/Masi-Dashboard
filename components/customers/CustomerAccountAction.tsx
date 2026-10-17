/**
 * STOP / REACTIVATE ACCOUNT button on the customer file ("إيقاف الحساب" / "إعادة تفعيل الحساب").
 * Opens a confirmation box first. Stopping needs a reason (saved in the customer's notes).
 * Sends to POST /api/customers/<id>/status (the server checks the permission again).
 * Only shown for customers with an account (guests have nothing to stop) and staff with customers = edit.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fill } from "@/lib/format";

type Labels = { actions: Record<string, string>; errors: Record<string, string> };

export function CustomerAccountAction({ customerId, name, disabled, labels }: { customerId: string; name: string; disabled: boolean; labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const a = labels.actions;
  const stopping = !disabled; // what the button will do

  async function send() {
    if (stopping && !reason.trim()) return setError(labels.errors.reason_required);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disabled: stopping, reason: reason.trim() || undefined }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      setOpen(false);
      setReason("");
      router.refresh();
    } else {
      setError(labels.errors[data.error] ?? (res?.status === 403 ? labels.errors.forbidden : labels.errors.failed));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold",
          stopping ? "text-destructive hover:bg-[#f6e0dc]" : "border border-input bg-card hover:bg-muted",
        )}
      >
        {stopping ? <Ban className="size-4" /> : <RotateCcw className="size-4" />}
        {stopping ? a.disable : a.enable}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={a.close}>
          <DialogTitle>{fill(stopping ? a.disableTitle : a.enableTitle, { name })}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">{stopping ? a.disableText : a.enableText}</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex flex-col gap-4"
          >
            {stopping && (
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {a.reason}
                <textarea value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} rows={3} className="rounded-lg border border-input bg-card px-3 py-2 font-normal" />
              </label>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
                {a.close}
              </button>
              <button type="submit" disabled={busy} className={cn("h-11 rounded-lg px-5 font-semibold text-white disabled:opacity-60", stopping ? "bg-destructive" : "bg-gold")}>
                {busy ? a.working : a.confirm}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
