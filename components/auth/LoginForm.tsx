/**
 * LOGIN FORM — email + password, sends to POST /api/auth/login.
 * Checks the fields first with the same rules as the server (lib/validation/auth.ts).
 * On success it opens the page the staff member wanted (?next=…) or the overview.
 */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type Labels = Record<
  | "email"
  | "password"
  | "show"
  | "hide"
  | "forgot"
  | "submit"
  | "submitting"
  | "wrong"
  | "tooMany"
  | "error"
  | "emailInvalid"
  | "passwordRequired",
  string
>;

export function LoginForm({ next, labels }: { next: string; labels: Labels }) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const fieldError = (key?: string) => (key ? (labels[key as keyof Labels] ?? key) : undefined);

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        // Full page load so the dashboard reads the new cookie
        window.location.assign(next);
        return;
      }
      setServerError(data.error === "too_many_attempts" ? labels.tooMany : data.error === "invalid_credentials" || data.error === "inactive" ? labels.wrong : labels.error);
    } catch {
      setServerError(labels.error);
    }
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <p role="alert" className="rounded-lg border border-[#e7c3bc] bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" type="email" dir="ltr" autoComplete="username" placeholder="staff@store.com" className="h-12 bg-card" aria-invalid={!!errors.email} {...register("email")} />
        {errors.email && <span className="text-sm text-destructive">{fieldError(errors.email.message)}</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{labels.password}</Label>
          <Link href="/forgot-password" className="text-sm text-gold hover:underline">
            {labels.forgot}
          </Link>
        </div>
        <div dir="ltr" className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="h-12 bg-card pe-20"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute end-1.5 top-1.5 h-9 rounded-md bg-muted px-3 text-sm hover:bg-accent"
          >
            {showPassword ? labels.hide : labels.show}
          </button>
        </div>
        {errors.password && <span className="text-sm text-destructive">{fieldError(errors.password.message)}</span>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-12 text-base">
        {isSubmitting ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
