/**
 * PAGE: /forgot-password — asks for the email and sends a reset link (design screen 16).
 * Texts -> dictionaries → "forgot". The form -> components/auth/ForgotForm.tsx
 */
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.forgot.title };
}

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <AuthShell locale={locale} dict={dict}>
      <ForgotForm labels={{ ...dict.forgot, email: dict.login.email, emailInvalid: dict.login.emailInvalid, error: dict.login.error }} />
    </AuthShell>
  );
}
