/**
 * PAGE: / — OVERVIEW (design screen 2). The first page after login.
 * ------------------------------------------------------------------
 *   [4 number cards]
 *   [latest orders table]      [gold prices today]
 *                              [quick actions]
 * All data comes from ONE call: api.getOverview() (lib/api) — real orders, messages and stock
 * Cards only link to sections the staff member is allowed to open.
 *   - Texts -> dictionaries → "overview"
 *   - Cards -> components/overview/*
 */
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatMoney, formatNumber, t } from "@/lib/format";
import { StatCard } from "@/components/overview/StatCard";
import { RecentOrders } from "@/components/overview/RecentOrders";
import { GoldPricesCard } from "@/components/overview/GoldPricesCard";
import { QuickActions } from "@/components/overview/QuickActions";

export default async function OverviewPage() {
  const session = await requireStaff();
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.overview;
  const data = await api.getOverview(session.token);

  const change = data.salesChangePct;
  const link = (key: Parameters<typeof can>[1], href: string) => (can(session, key) ? href : undefined);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-bold">{fill(d.greeting, { name: t(session.name, locale) })}</h2>
        {process.env.DATA_SOURCE !== "http" && <span className="text-xs text-muted-foreground">{d.sample}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={d.salesToday}
          value={formatMoney(data.salesToday, data.currency, locale)}
          note={fill(d.vsYesterday, { pct: `${change > 0 ? "+" : ""}${formatNumber(change, locale)}` })}
          tone={change >= 0 ? "good" : "bad"}
          href={link("reports", "/reports")}
        />
        <StatCard
          label={d.newOrders}
          value={formatNumber(data.newOrders, locale)}
          note={fill(d.awaiting, { count: formatNumber(data.awaitingConfirmation, locale) })}
          tone="info"
          href={link("orders", "/orders")}
        />
        <StatCard label={d.unread} value={formatNumber(data.unreadMessages, locale)} note={d.fromContact} href={link("inbox", "/inbox?status=new")} />
        <StatCard
          label={d.lowStock}
          value={formatNumber(data.lowStockProducts, locale)}
          note={d.fromErp}
          tone={data.lowStockProducts ? "warn" : undefined}
          href={link("products", "/products")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <RecentOrders
          orders={data.recentOrders}
          locale={locale}
          labels={{ ...d, ...dict.table }}
          statusLabels={dict.status}
          canOpen={can(session, "orders")}
        />
        <div className="flex flex-col gap-5">
          <GoldPricesCard prices={data.goldPrices} locale={locale} labels={d} canManage={can(session, "pricing")} />
          <QuickActions
            title={d.quickActions}
            actions={[
              can(session, "products", "edit") && { href: "/products/new", label: d.addProduct, primary: true },
              can(session, "content", "edit") && { href: "/home-builder", label: d.editHome },
              can(session, "pricing", "edit") && { href: "/pricing", label: d.newCoupon },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
