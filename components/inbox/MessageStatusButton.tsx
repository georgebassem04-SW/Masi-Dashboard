/**
 * "تم التعامل معها" / "إعادة فتح" button on an open message.
 * Sends to POST /api/inbox/<id>/status.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, RotateCcw } from "lucide-react";
import type { MessageStatus } from "@/types";

export function MessageStatusButton({ id, status, labels }: { id: string; status: MessageStatus; labels: { done: string; reopen: string; error: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const to = status === "done" ? "open" : "done";

  async function send() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/inbox/${encodeURIComponent(id)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(true);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className={
          to === "done"
            ? "inline-flex h-10 items-center gap-1.5 rounded-lg border border-[var(--status-done-fg)]/30 bg-[var(--status-done-bg)] px-3 text-sm font-semibold text-[var(--status-done-fg)] hover:opacity-90 disabled:opacity-60"
            : "inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        }
      >
        {to === "done" ? <CheckCheck className="size-4" /> : <RotateCcw className="size-4" />}
        {to === "done" ? labels.done : labels.reopen}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {labels.error}
        </span>
      )}
    </span>
  );
}
