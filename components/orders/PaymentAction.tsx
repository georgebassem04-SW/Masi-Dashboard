/**
 * PAYMENT BUTTON — "تأكيد استلام المبلغ" (bank transfer arrived, cash received) or
 * "تسجيل استرداد المبلغ" (after cancel/return). Only shown when that change is allowed
 * (nextPaymentStatuses in lib/orders/workflow.ts). Sends to POST /api/orders/<id>/payment.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaymentStatus } from "@/types";

export function PaymentAction({
  orderId,
  to,
  label,
  errorLabel,
}: {
  orderId: string;
  to: Extract<PaymentStatus, "paid" | "refunded">;
  label: string;
  errorLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function send() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: to }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={send}
        className={to === "paid" ? "h-11 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-sidebar-active disabled:opacity-60" : "h-11 rounded-lg border border-input font-semibold hover:bg-muted disabled:opacity-60"}
      >
        {label}
      </button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {errorLabel}
        </p>
      )}
    </div>
  );
}
