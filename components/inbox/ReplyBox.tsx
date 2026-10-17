/**
 * REPLY BOX under a contact message.
 *   - Choose how to answer: email / WhatsApp / phone call (starts on the visitor's preferred way)
 *   - "Ready replies" fill the box in the VISITOR's language (edit them in config/reply-templates.ts)
 *   - email    -> saved and emailed by the API
 *   - WhatsApp -> opens WhatsApp with the text ready (wa.me), then saves the reply here
 *   - phone    -> "call" link + a box for the call summary
 * Sends to POST /api/inbox/<id>/reply.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import type { ContactChannel } from "@/types";
import { cn } from "@/lib/utils";
import { fill } from "@/lib/format";

type Labels = {
  title: string;
  how: string;
  hint: Record<ContactChannel, string>;
  placeholder: Record<ContactChannel, string>;
  templates: string;
  markDone: string;
  send: Record<ContactChannel, string>;
  sending: string;
  sent: string;
  noEmail: string;
  channels: Record<ContactChannel, string>;
  errors: Record<string, string>;
};

const ICONS = { email: Mail, whatsapp: MessageCircle, phone: Phone };

export function ReplyBox({
  id,
  phone,
  email,
  preferred,
  languageName,
  templates,
  labels,
}: {
  id: string;
  phone: string;
  email?: string;
  preferred: ContactChannel;
  /** Name of the visitor's language, shown in the email hint */
  languageName: string;
  /** Ready replies, already in the visitor's language with {name}/{store} filled */
  templates: { key: string; title: string; text: string }[];
  labels: Labels;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<ContactChannel>(preferred === "email" && !email ? "whatsapp" : preferred);
  const [text, setText] = useState("");
  const [markDone, setMarkDone] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const phoneDigits = phone.replace(/\D/g, "");

  async function save() {
    const body = text.trim();
    if (!body) return;
    // Open WhatsApp first (must happen right after the click, or the browser blocks the new tab)
    if (channel === "whatsapp") window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(body)}`, "_blank", "noopener");
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/inbox/${encodeURIComponent(id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, text: body, markDone }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      setText("");
      setMessage({ tone: "ok", text: labels.sent });
      router.refresh();
    } else {
      setMessage({ tone: "error", text: labels.errors[data.error] ?? (res?.status === 403 ? labels.errors.forbidden : labels.errors.failed) });
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{labels.how}</span>
        <div role="radiogroup" aria-label={labels.how} className="flex flex-wrap gap-1.5">
          {(["email", "whatsapp", "phone"] as ContactChannel[]).map((c) => {
            const Icon = ICONS[c];
            const disabled = c === "email" && !email;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={channel === c}
                disabled={disabled}
                title={disabled ? labels.noEmail : undefined}
                onClick={() => setChannel(c)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm disabled:opacity-40",
                  channel === c ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {labels.channels[c]}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {fill(labels.hint[channel], { language: languageName })}
        {channel === "phone" && (
          <>
            {" "}
            <a href={`tel:${phone}`} dir="ltr" className="font-semibold text-gold underline-offset-2 hover:underline">
              {phone}
            </a>
          </>
        )}
      </p>

      {channel !== "phone" && templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{labels.templates}:</span>
          {templates.map((t) => (
            <button key={t.key} type="button" onClick={() => setText(t.text)} className="h-8 rounded-full bg-accent px-3 text-xs font-semibold text-gold hover:opacity-80">
              {t.title}
            </button>
          ))}
        </div>
      )}

      <label htmlFor="reply-text" className="sr-only">
        {labels.title}
      </label>
      <textarea
        id="reply-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={3000}
        rows={4}
        placeholder={labels.placeholder[channel]}
        className="rounded-lg border border-input bg-card px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--gold)]" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
          {labels.markDone}
        </label>
        <button type="submit" disabled={busy || !text.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-50">
          <Send className="size-4 rtl:-scale-x-100" />
          {busy ? labels.sending : labels.send[channel]}
        </button>
      </div>
    </form>
  );
}
