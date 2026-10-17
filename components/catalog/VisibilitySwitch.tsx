/**
 * SHOW / HIDE switch in the products list ("ظاهر في الموقع").
 * Changes right away (POST /api/products/<id>/visibility); goes back if the save fails.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function VisibilitySwitch({ id, visible, label, disabled, labels }: { id: string; visible: boolean; label: string; disabled?: boolean; labels: { failed: string } }) {
  const router = useRouter();
  const [on, setOn] = useState(visible);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    setFailed(false);
    const res = await fetch(`/api/products/${encodeURIComponent(id)}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: next }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else {
      setOn(!next);
      setFailed(true);
    }
  }

  return (
    <span className="relative z-10 inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled || busy}
        onClick={toggle}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-gold" : "bg-input")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "start-6" : "start-1")} />
      </button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          {labels.failed}
        </span>
      )}
    </span>
  );
}
