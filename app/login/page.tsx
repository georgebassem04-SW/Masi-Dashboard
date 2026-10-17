/**
 * PAGE: /login — staff login (design screen 1).
 * Left/right split: the form, and a dark panel with what the dashboard does.
 *   - Texts           -> lib/i18n/dictionaries/*.json → "login"
 *   - The form itself -> components/auth/LoginForm.tsx
 * Already logged in (valid cookie)? -> goes straight to the overview.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { safeNext } from "@/lib/validation/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/auth/AuthShell";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.login.submit };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext(String((await searchParams).next ?? "/"));
  if (await getStaffSession()) redirect(next);

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <AuthShell locale={locale} dict={dict} side>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">{dict.login.title}</h1>
        <p className="text-muted-foreground">{dict.login.subtitle}</p>
      </div>
      <LoginForm next={next} labels={dict.login} />
      <p className="text-sm text-muted-foreground">{dict.login.staffNote}</p>
      {process.env.DATA_SOURCE !== "http" && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm" dir="auto">
          {dict.login.demoHint}
        </p>
      )}
    </AuthShell>
  );
}
