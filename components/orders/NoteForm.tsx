/**
 * INTERNAL NOTE BOX — under the order history and in the customer's file. Staff-only; the customer never sees it.
 * `endpoint` = where to send it, e.g. /api/orders/<id>/notes or /api/customers/<id>/notes. Then the page reloads.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoteForm({ endpoint, labels }: { endpoint: string; labels: { addNote: string; notePlaceholder: string; saveNote: string; error: string } }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        setBusy(true);
        setError(false);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        }).catch(() => null);
        setBusy(false);
        if (res?.ok) {
          setNote("");
          router.refresh();
        } else setError(true);
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="staff-note" className="text-sm font-semibold">
        {labels.addNote}
      </label>
      <textarea
        id="staff-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={labels.notePlaceholder}
        className="rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {labels.error}
        </p>
      )}
      <button type="submit" disabled={busy || !note.trim()} className="h-10 self-end rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
        {labels.saveNote}
      </button>
    </form>
  );
}
