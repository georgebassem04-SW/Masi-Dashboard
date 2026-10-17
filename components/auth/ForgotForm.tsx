/**
 * FORGOT PASSWORD FORM — email field → POST /api/auth/forgot → "check your email" message.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Labels = Record<"title" | "subtitle" | "submit" | "sentTitle" | "sentText" | "back" | "email" | "emailInvalid" | "error", string>;

export function ForgotForm({ labels }: { labels: Labels }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!z.email().safeParse(email.trim()).success) return setError(labels.emailInvalid);
    setError(null);
    setState("sending");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => null);
    if (res?.ok) setState("sent");
    else {
      setState("idle");
      setError(labels.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {state === "sent" ? (
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold">{labels.sentTitle}</h1>
          <p className="leading-relaxed text-muted-foreground">{labels.sentText}</p>
        </div>
      ) : (
        <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold">{labels.title}</h1>
            <p className="text-muted-foreground">{labels.subtitle}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{labels.email}</Label>
            <Input id="email" type="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-card" aria-invalid={!!error} />
            {error && (
              <span role="alert" className="text-sm text-destructive">
                {error}
              </span>
            )}
          </div>
          <Button type="submit" disabled={state === "sending"} className="h-12 text-base">
            {labels.submit}
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm font-semibold text-gold hover:underline">
        {labels.back}
      </Link>
    </div>
  );
}
