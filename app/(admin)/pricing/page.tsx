/**
 * PAGE: /pricing — GOLD PRICES & COUPONS (design screen 13)
 * ------------------------------------------------------------------
 *   [Today's gold prices: source ERP / manual · price per karat · sync or save · recent changes]  [Price lock at checkout]
 *   [Discount codes: list · new / edit / pause / delete]
 * Data: api.getPricing() + api.listCoupons() + api.listProducts() (for "chosen products" in a coupon / offer).
 *   - Gold card: components/pricing/GoldPricesCard.tsx · lock: PriceLockCard.tsx · coupons: CouponsManager.tsx
 *   - Texts: dictionaries → "pricing"
 * Needs permission "pricing" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NoAccess } from "@/components/common/NoticePage";
import { GoldPricesCard } from "@/components/pricing/GoldPricesCard";
import { PriceLockCard } from "@/components/pricing/PriceLockCard";
import { CouponsManager } from "@/components/pricing/CouponsManager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.pricing };
}

export default async function PricingPage() {
  const session = await requireStaff();
  if (!can(session, "pricing")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [pricing, coupons, productList] = await Promise.all([api.getPricing(session.token), api.listCoupons(session.token), api.listProducts({ pageSize: 5000, sort: "name" }, session.token)]);
  // The products a coupon / special offer can be limited to
  const products = productList.items.map((p) => ({ id: p.id, name: p.name[locale], otherName: p.name[locale === "ar" ? "en" : "ar"], sku: p.sku, imageUrl: p.imageUrl }));
  const canEdit = can(session, "pricing", "edit");

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {!canEdit && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{dict.pricing.viewOnly}</p>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GoldPricesCard state={pricing} canEdit={canEdit} locale={locale} labels={dict.pricing} />
        <PriceLockCard state={pricing} canEdit={canEdit} labels={dict.pricing} />
      </div>
      <CouponsManager coupons={coupons} products={products} currency={pricing.currency} canEdit={canEdit} locale={locale} labels={dict.pricing} />
    </div>
  );
}
