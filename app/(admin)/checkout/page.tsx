/**
 * PAGE: /checkout — SHIPPING & PAYMENT (design screen 10)
 * ------------------------------------------------------------------
 *   [Delivery areas: fee · free over · time · on/off · order]   [Branch pickup]  [VAT & minimum order]
 *   [Payment methods: on/off · order · details]
 *   [Save bar at the bottom — one Save for the whole page]
 * Data: api.getCheckoutSettings() + api.getBranches() (the pickup branches list).
 *   - Editor: components/checkout-settings/CheckoutSettingsEditor.tsx
 *   - Safety rules (e.g. at least one payment method for delivery): lib/checkout-settings/rules.ts
 *   - Texts: dictionaries → "checkoutSettings"
 * Needs permission "checkout" (view to see, edit to change).
 * The price lock & gold-price tolerance are on the Gold prices page, not here.
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { CheckoutSettingsEditor } from "@/components/checkout-settings/CheckoutSettingsEditor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.checkout };
}

export default async function CheckoutSettingsPage() {
  const session = await requireStaff();
  if (!can(session, "checkout")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [settings, branches] = await Promise.all([api.getCheckoutSettings(session.token), api.getBranches(session.token)]);
  const canEdit = can(session, "checkout", "edit");

  return (
    <div className="flex flex-col gap-5 p-4 pb-0 sm:p-6 sm:pb-0 lg:p-7 lg:pb-0">
      {!canEdit && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{dict.checkoutSettings.viewOnly}</p>}
      <CheckoutSettingsEditor initial={settings} branches={branches} currency={storeConfig.currency} canEdit={canEdit} locale={locale} labels={dict.checkoutSettings} />
    </div>
  );
}
