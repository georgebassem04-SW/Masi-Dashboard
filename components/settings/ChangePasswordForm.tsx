/**
 * CHANGE MY PASSWORD — current password, new password twice. PUT /api/account/password.
 * First login with a temporary password: this is the only thing the person can do until it's changed;
 * after saving they go to the Overview page.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { passwordProblem } from "@/lib/staff/rules";
import { Card, Field, Message, TextBox, fieldErrors, send } from "./ui";

type L = Dictionary["settings"];

export function ChangePasswordForm({ first, labels: L }: { first: boolean; labels: L }) {
  const router = useRouter();
  const A = L.account;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const errText = (code?: string) => (code ? (A[code as keyof typeof A] as string | undefined) ?? L.errors[code as keyof L["errors"]] ?? L.errors.required : null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!current) local.current = "required";
    const p = passwordProblem(next);
    if (p) local.next = p;
    else if (next !== repeat) local.repeat = "noMatch";
    setErrors(local);
    setMessage(null);
    if (Object.keys(local).length) return;
    setBusy(true);
    const { res, data } = await send("/api/account/password", "PUT", { current, next });
    setBusy(false);
    if (res?.ok) {
      setCurrent("");
      setNext("");
      setRepeat("");
      setMessage({ tone: "ok", text: A.changed });
      if (first) router.replace("/");
      router.refresh();
      return;
    }
    if (data.error === "wrong_password") setErrors({ current: "wrong_password" });
    else setErrors(fieldErrors(data));
    setMessage({ tone: "error", text: L.errors[data.error as keyof L["errors"]] ?? L.errors.failed });
  }

  const type = show ? "text" : "password";
  return (
    <Card title={A.changePassword} hint={A.rules}>
      <form onSubmit={save} className="flex max-w-md flex-col gap-4" noValidate>
        <Field label={A.current} error={errText(errors.current)}>
          <TextBox type={type} dir="ltr" autoComplete="current-password" maxLength={200} value={current} onChange={(e) => setCurrent(e.target.value)} error={errText(errors.current)} />
        </Field>
        <Field label={A.next} error={errText(errors.next)}>
          <TextBox type={type} dir="ltr" autoComplete="new-password" maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} error={errText(errors.next)} />
        </Field>
        <Field label={A.repeat} error={errText(errors.repeat)}>
          <TextBox type={type} dir="ltr" autoComplete="new-password" maxLength={128} value={repeat} onChange={(e) => setRepeat(e.target.value)} error={errText(errors.repeat)} />
        </Field>
        <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-gold">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {show ? A.hide : A.show}
        </button>
        {message && <Message tone={message.tone}>{message.text}</Message>}
        <button type="submit" disabled={busy} className="h-11 self-start rounded-lg bg-gold px-6 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? L.common.saving : A.changePassword}
        </button>
      </form>
    </Card>
  );
}
