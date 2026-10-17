/**
 * STAFF ACCOUNT ACTIONS (bottom of a staff member's page)
 *   - Give a new temporary password (they choose their own at next login) -> PUT /api/staff/<id>/password
 *   - Delete the staff member                                              -> DELETE /api/staff/<id>
 * Hidden for yourself; the server checks the same rules (lib/staff/rules.ts).
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { makeTempPassword } from "@/lib/staff/rules";
import { fill } from "@/lib/format";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Card, Message, send } from "./ui";

type L = Dictionary["settings"];

export function StaffAccountActions({ id, name, labels: L }: { id: string; name: string; labels: L }) {
  const router = useRouter();
  const F = L.form;
  const [confirm, setConfirm] = useState<null | "reset" | "delete">(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const action = confirm;
    setConfirm(null);
    setError(null);
    if (action === "reset") {
      const password = makeTempPassword();
      const { res, data } = await send(`/api/staff/${encodeURIComponent(id)}/password`, "PUT", { password });
      if (res?.ok) {
        setNewPassword(password);
        router.refresh();
      } else setError(L.errors[data.error as keyof L["errors"]] ?? L.errors.failed);
    }
    if (action === "delete") {
      const { res, data } = await send(`/api/staff/${encodeURIComponent(id)}`, "DELETE");
      if (res?.ok) router.replace("/settings/staff");
      else setError(L.errors[data.error as keyof L["errors"]] ?? L.errors.failed);
    }
  }

  return (
    <Card title={F.account}>
      {newPassword && (
        <div className="flex flex-wrap items-center gap-2">
          <Message tone="ok">{fill(F.resetDone, { password: newPassword })}</Message>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(newPassword).catch(() => undefined);
              setCopied(true);
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? F.copied : F.copy}
          </button>
        </div>
      )}
      {error && <Message tone="error">{error}</Message>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setConfirm("reset")} className="inline-flex h-10 items-center gap-2 self-start rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted">
            <KeyRound className="size-4" />
            {F.resetPassword}
          </button>
          <span className="text-xs text-muted-foreground">{F.resetHint}</span>
        </div>
        <div className="flex flex-col gap-1">
          <button type="button" onClick={() => setConfirm("delete")} className="inline-flex h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
            <Trash2 className="size-4" />
            {F.delete}
          </button>
          <span className="max-w-xs text-xs text-muted-foreground">{F.deleteHint}</span>
        </div>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent closeLabel={L.common.cancel}>
          <DialogTitle>{confirm === "delete" ? fill(F.deleteConfirm, { name }) : F.resetPassword}</DialogTitle>
          <DialogDescription>{confirm === "delete" ? F.deleteHint : F.resetHint}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {L.common.cancel}
            </button>
            <button type="button" onClick={run} className={confirm === "delete" ? "h-11 rounded-lg bg-destructive px-5 font-semibold text-white" : "h-11 rounded-lg bg-gold px-5 font-semibold text-gold-foreground"}>
              {confirm === "delete" ? L.common.delete : L.common.confirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
