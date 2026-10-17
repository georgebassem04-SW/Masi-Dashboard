/**
 * PAGE: /print/orders/<id> — PRINTABLE INVOICE (design screen 22)
 * ------------------------------------------------------------------
 * A clean A4 page without the sidebar, opened from "Print invoice" on the order page.
 * Store name + logo come from the published website theme (Theme & design).
 *   - Tax number / footer text -> dictionaries → "orders.invoice"
 *   - QR code for e-invoicing (ZATCA / ETA) is added when the real API provides it
 * Needs permission "orders" (view).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getDirection, getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatMoney, formatNumber, t } from "@/lib/format";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { PrintButton } from "@/components/orders/PrintButton";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: PageProps<"/print/orders/[id]">): Promise<Metadata> {
  return { title: `Invoice ${decodeURIComponent((await params).id)}` };
}

export default async function InvoicePage({ params }: PageProps<"/print/orders/[id]">) {
  const session = await requireStaff();
  if (!can(session, "orders")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.orders.detail;
  const inv = dict.orders.invoice;
  const [order, theme, branches] = await Promise.all([
    api.getOrder(decodeURIComponent((await params).id), session.token),
    api.getThemeState(session.token).then((s) => s.published).catch(() => null),
    api.getBranches(session.token),
  ]);
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, order.currency, locale);
  const storeName = theme ? t(theme.brand.name, locale) : t(storeConfig.name, locale);
  const logo = theme?.brand.logo ? (theme.brand.logo.startsWith("/") ? `${storeConfig.storefrontUrl.replace(/\/$/, "")}${theme.brand.logo}` : theme.brand.logo) : null;
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { dateStyle: "long" }).format(new Date(order.createdAt));
  const branch = branches.find((b) => b.id === order.pickupBranchId);

  return (
    <div dir={getDirection(locale)} className="min-h-dvh bg-muted py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-between px-4 print:hidden">
        <Link href={`/orders/${order.id}`} className="flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-gold hover:bg-card">
          {inv.back}
        </Link>
        <PrintButton label={inv.printNow} />
      </div>

      <article className="mx-auto flex min-h-[297mm] max-w-[210mm] flex-col gap-6 bg-white p-[14mm] text-[13px] text-[#1f1d1a] shadow-sm print:min-h-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-gold pb-5">
          <div className="flex items-center gap-3">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="size-12 object-contain" />
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold">{storeName}</span>
              <span className="text-xs text-muted-foreground">{inv.taxNo}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <h1 className="text-2xl font-bold">{inv.taxInvoice}</h1>
            <span>
              {inv.number}: <b dir="ltr">{order.number.replace("ORD", "INV")}</b>
            </span>
            <span>
              {inv.date}: {date}
            </span>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 rounded-lg bg-[#faf8f4] p-3">
            <span className="text-xs text-muted-foreground">{inv.billTo}</span>
            <b>{order.customer.name}</b>
            <span dir="ltr" className="self-start">
              {order.customer.phone}
            </span>
            {order.shippingAddress && <span>{[order.shippingAddress.street, order.shippingAddress.area, order.shippingAddress.city].filter(Boolean).join("، ")}</span>}
            {branch && <span>{fill(`${d.pickupAt}: {b}`, { b: t(branch.name, locale) })}</span>}
          </div>
          <div className="flex flex-col gap-1 rounded-lg bg-[#faf8f4] p-3">
            <span className="text-xs text-muted-foreground">{inv.order}</span>
            <b dir="ltr" className="self-start">
              {order.number}
            </b>
            <span>
              {d.method}: {dict.orders.paymentMethod[order.paymentMethod]} — {dict.orders.paymentStatus[order.paymentStatus]}
            </span>
            <span className="text-xs text-muted-foreground">{d.priceLocked}</span>
          </div>
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1f1d1a] text-white">
              {[inv.item, d.karat.replace("{karat}", "").trim() || "K", d.weight, d.making, inv.unit, inv.lineTotal].map((h, i) => (
                <th key={i} className="px-2 py-2 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.variantId} className="border-b border-[#e4ded2]">
                <td className="px-2 py-2">
                  <b>{t(l.name, locale)}</b>
                  <div dir="ltr" className="text-[11px] text-muted-foreground rtl:text-right">
                    {l.sku}
                    {l.size ? ` · ${l.size}` : ""} × {l.quantity}
                  </div>
                </td>
                <td className="px-2 py-2">{l.karat}</td>
                <td className="px-2 py-2">
                  {formatNumber(l.weightGrams, locale)} {d.grams}
                </td>
                <td className="px-2 py-2">{money(l.makingCharge)}</td>
                <td className="px-2 py-2">{money(l.unitPrice)}</td>
                <td className="px-2 py-2 font-semibold">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="ms-auto flex w-72 flex-col gap-1.5">
          <div className="flex justify-between">
            <span>{d.subtotal}</span>
            <span>{money(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span>{order.couponCode ? fill(d.coupon, { code: order.couponCode }) : d.discount}</span>
              <span>− {money(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{d.vat}</span>
            <span>{money(order.vat)}</span>
          </div>
          <div className="flex justify-between">
            <span>{d.shipping}</span>
            <span>{order.shipping ? money(order.shipping) : d.free}</span>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-[#1f1d1a] pt-2 text-base font-bold">
            <span>{d.total}</span>
            <span>{money(order.total)}</span>
          </div>
        </section>

        <footer className="mt-auto border-t border-[#e4ded2] pt-3 text-center text-xs text-muted-foreground">
          {inv.thanks} — {storeName}
        </footer>
      </article>
    </div>
  );
}
