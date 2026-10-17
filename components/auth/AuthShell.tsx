/**
 * AUTH SHELL — the frame around the login and forgot-password pages:
 * store logo + name at the top, the page content, and (on large screens, when side=true)
 * the dark panel with four feature boxes. Texts: dictionaries → "login".
 */
import type { Locale } from "@/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { t } from "@/lib/format";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";

export function AuthShell({
  locale,
  dict,
  side = false,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  side?: boolean;
  children: React.ReactNode;
}) {
  const features =
    locale === "ar"
      ? [
          ["الطلبات", "تابع كل طلب من الاستلام حتى التسليم"],
          ["أسعار الذهب", "تتحدث تلقائياً من نظام ERP"],
          ["المحتوى", "عدّل الصفحة الرئيسية والصفحات بدون مبرمج"],
          ["العملاء", "الحسابات والطلبات السابقة والرسائل"],
        ]
      : [
          ["Orders", "Follow every order from receipt to delivery"],
          ["Gold prices", "Updated automatically from the ERP"],
          ["Content", "Edit the homepage and pages without a developer"],
          ["Customers", "Accounts, past orders and messages"],
        ];

  return (
    <div className="flex min-h-dvh">
      <section className="flex w-full flex-col justify-center gap-8 px-6 py-10 sm:px-16 lg:w-[620px] lg:shrink-0 lg:px-24">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-gold font-heading text-2xl font-bold text-gold-foreground">
              {t(storeConfig.name, locale).charAt(0)}
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-bold">{dict.app.title}</span>
              <span className="text-sm text-muted-foreground">{t(storeConfig.name, locale)}</span>
            </div>
          </div>
          <LanguageSwitch label={dict.app.switchLanguage} target={locale === "ar" ? "en" : "ar"} />
        </div>
        {children}
      </section>
      {side && (
        <section className="hidden flex-1 flex-col justify-end gap-5 bg-sidebar p-16 text-[#f4f1ea] lg:flex">
          <div className="grid max-w-xl grid-cols-2 gap-4">
            {features.map(([title, text]) => (
              <div key={title} className="flex flex-col gap-1.5 rounded-xl border border-sidebar-active p-5">
                <span className="text-sm text-sidebar-active-foreground">{title}</span>
                <span className="text-sidebar-foreground">{text}</span>
              </div>
            ))}
          </div>
          <h2 className="max-w-xl text-5xl leading-snug font-bold">{dict.login.sideTitle}</h2>
        </section>
      )}
    </div>
  );
}
