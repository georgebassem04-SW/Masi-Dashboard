/**
 * "مزامنة مع ERP" button — pulls weight, stock and new products from the ERP now
 * (POST /api/products/sync), then reloads the list and says how many products changed.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SyncButton({ labels }: { labels: { sync: string; syncing: string; synced: string; failed: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/products/sync", { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setMessage(res?.ok ? fill(labels.synced, { n: data.updated ?? 0 }) : labels.failed);
    if (res?.ok) router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={sync} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">
        <RefreshCw className={cn("size-4", busy && "animate-spin")} />
        {busy ? labels.syncing : labels.sync}
      </button>
      {message && (
        <span role="status" className="text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </span>
  );
}
