/**
 * PAGE: /orders/<id> — ONE ORDER (design screen 4)
 * ------------------------------------------------------------------
 *   [← Orders   ORD-1042  status · payment        Print invoice]
 *   [progress steps + next-step buttons]   [customer]
 *   [items]                                [delivery / pickup]
 *   [history + internal note]              [summary] [payment]
 * Data: api.getOrder() + api.getBranches(). Changes go through /api/orders/<id>/… (see components/orders/*).
 *   - Which step can follow which: lib/orders/workflow.ts
 *   - Texts: dictionaries → "orders", "status"
 * Needs permission "orders" (view to see, edit to change).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail, MessageCircle, Phone, Printer, UserRound } from "lucide-react";
import type { AdminOrder, Locale, OrderEvent } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatMoney, formatNumber, t } from "@/lib/format";
import { nextPaymentStatuses, nextStatuses, STEPS } from "@/lib/orders/workflow";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common/Card";
import { NoAccess, NoticePage } from "@/components/common/NoticePage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaymentBadge } from "@/components/orders/PaymentBadge";
import { OrderActions } from "@/components/orders/OrderActions";
import { PaymentAction } from "@/components/orders/PaymentAction";
import { NoteForm } from "@/components/orders/NoteForm";
import { SearchX } from "lucide-react";

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  return { title: decodeURIComponent((await params).id).toUpperCase() };
}

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const session = await requireStaff();
  if (!can(session, "orders")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.orders.detail;
  const { id } = await params;
  const [order, branches] = await Promise.all([api.getOrder(decodeURIComponent(id), session.token), api.getBranches(session.token)]);
  if (!order) return <NoticePage icon={SearchX} title={d.notFound} backLabel={d.back} />;

  const canEdit = can(session, "orders", "edit");
  const money = (n: number) => formatMoney(n, order.currency, locale);
  const next = nextStatuses(order);
  const payNext = nextPaymentStatuses(order);
  const branch = branches.find((b) => b.id === order.pickupBranchId);
  const phoneDigits = order.customer.phone.replace(/[^\d]/g, "");
  // Customer file: accounts open directly, guests through a search by phone
  const customerHref = can(session, "customers") ? (order.customerId ? `/customers/${encodeURIComponent(order.customerId)}` : `/customers?q=${encodeURIComponent(order.customer.phone)}`) : null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/orders" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {d.back}
        </Link>
        <h2 dir="ltr" className="text-2xl font-bold">
          {order.number}
        </h2>
        <StatusBadge status={order.status} label={dict.status[order.status]} />
        <PaymentBadge status={order.paymentStatus} label={dict.orders.paymentStatus[order.paymentStatus]} />
        <span className="text-sm text-muted-foreground">
          {d.placedAt}: {formatDateTime(order.createdAt, locale)}
        </span>
        <div className="flex-1" />
        <Link href={`/print/orders/${order.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted">
          <Printer className="size-4" />
          {d.print}
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ===== Main column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={d.progress}>
            <div className="flex flex-col gap-5 px-5 pb-5">
              <Steps order={order} dict={dict} />
              {(order.status === "cancelled" || order.status === "returned") && order.cancelReason && (
                <p className="rounded-lg bg-[var(--status-cancel-bg)] px-3 py-2 text-sm text-[var(--status-cancel-fg)]">{order.cancelReason}</p>
              )}
              {canEdit ? (
                next.length ? (
                  <div className="flex flex-col gap-2">
                    <OrderActions orderId={order.id} orderNumber={order.number} next={next} labels={{ actions: dict.orders.actions, dialog: dict.orders.dialog, errors: dict.orders.errors }} />
                    <p className="text-xs text-muted-foreground">{d.customerSees}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{d.noActions}</p>
                )
              ) : (
                <p className="rounded-lg bg-accent px-3 py-2 text-sm">{d.viewOnly}</p>
              )}
            </div>
          </Card>

          <Card title={`${d.items} (${formatNumber(order.lines.reduce((s, l) => s + l.quantity, 0), locale)})`}>
            <ul className="flex flex-col">
              {order.lines.map((l) => (
                <li key={l.variantId} className="flex gap-3 border-t px-5 py-4">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {l.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.imageUrl} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold">{t(l.name, locale)}</span>
                    <span className="text-xs text-muted-foreground">
                      {d.sku}: <span dir="ltr">{l.sku}</span> · {fill(d.karat, { karat: l.karat })} · {d.weight} {formatNumber(l.weightGrams, locale)} {d.grams}
                      {l.size && (
                        <>
                          {" "}
                          · {d.size} {l.size}
                        </>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {d.goldRate}: {money(l.goldPricePerGram)} · {d.making}: {money(l.makingCharge)}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                    <span className="text-muted-foreground">
                      {money(l.unitPrice)} {fill(d.qty, { qty: formatNumber(l.quantity, locale) })}
                    </span>
                    <span className="font-bold">{money(l.lineTotal)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={d.history}>
            <div className="flex flex-col gap-5 px-5 pb-5">
              <Timeline events={order.events} dict={dict} locale={locale} />
              {canEdit && <NoteForm endpoint={`/api/orders/${encodeURIComponent(order.id)}/notes`} labels={{ ...d, error: dict.orders.errors.failed }} />}
            </div>
          </Card>
        </div>

        {/* ===== Side column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={d.customer}>
            <div className="flex flex-col gap-2 px-5 pb-5 text-sm">
              <span className="text-base font-semibold">{order.customer.name}</span>
              <span dir="ltr" className="self-start">
                {order.customer.phone}
              </span>
              {order.customer.email && <span className="break-all text-muted-foreground">{order.customer.email}</span>}
              <div className="mt-1 flex flex-wrap gap-2">
                <a href={`tel:${order.customer.phone}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 font-semibold hover:bg-muted">
                  <Phone className="size-4" />
                  {d.callCustomer}
                </a>
                <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 font-semibold hover:bg-muted">
                  <MessageCircle className="size-4" />
                  {d.whatsapp}
                </a>
                {order.customer.email && (
                  <a href={`mailto:${order.customer.email}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 font-semibold hover:bg-muted">
                    <Mail className="size-4" />
                    {d.email}
                  </a>
                )}
                {customerHref && (
                  <Link href={customerHref} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 font-semibold text-gold hover:bg-muted">
                    <UserRound className="size-4" />
                    {d.customerFile}
                  </Link>
                )}
              </div>
            </div>
          </Card>

          <Card title={order.deliveryMethod === "store_pickup" ? d.pickupAt : d.delivery}>
            <div className="flex flex-col gap-2 px-5 pb-5 text-sm">
              {order.deliveryMethod === "store_pickup" ? (
                <span className="font-semibold">{branch ? t(branch.name, locale) : order.pickupBranchId}</span>
              ) : (
                order.shippingAddress && (
                  <>
                    <span className="font-semibold">{order.shippingAddress.fullName}</span>
                    <span>
                      {[order.shippingAddress.street, order.shippingAddress.building, order.shippingAddress.area, order.shippingAddress.city].filter(Boolean).join("، ")}
                    </span>
                    {order.shippingAddress.notes && <span className="text-muted-foreground">{order.shippingAddress.notes}</span>}
                  </>
                )
              )}
              {order.trackingNumber && (
                <span>
                  {d.tracking}: <b dir="ltr">{order.trackingNumber}</b>
                </span>
              )}
              {order.notes && (
                <div className="mt-1 rounded-lg bg-accent px-3 py-2">
                  <span className="block text-xs font-semibold text-muted-foreground">{d.customerNote}</span>
                  {order.notes}
                </div>
              )}
            </div>
          </Card>

          <Card title={d.summary}>
            <dl className="flex flex-col gap-2 px-5 pb-5 text-sm">
              <Row label={d.subtotal} value={money(order.subtotal)} />
              {order.discount > 0 && <Row label={order.couponCode ? fill(d.coupon, { code: order.couponCode }) : d.discount} value={`− ${money(order.discount)}`} />}
              <Row label={d.vat} value={money(order.vat)} />
              <Row label={d.shipping} value={order.shipping ? money(order.shipping) : d.free} />
              <div className="mt-1 flex justify-between border-t pt-3 text-base font-bold">
                <dt>{d.total}</dt>
                <dd>{money(order.total)}</dd>
              </div>
              <p className="text-xs text-muted-foreground">{d.priceLocked}</p>
            </dl>
          </Card>

          <Card title={d.payment}>
            <div className="flex flex-col gap-3 px-5 pb-5 text-sm">
              <Row label={d.method} value={dict.orders.paymentMethod[order.paymentMethod]} />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{d.paymentState}</span>
                <PaymentBadge status={order.paymentStatus} label={dict.orders.paymentStatus[order.paymentStatus]} />
              </div>
              {canEdit &&
                payNext.map((to) => (
                  <PaymentAction key={to} orderId={order.id} to={to as "paid" | "refunded"} label={to === "paid" ? d.markPaid : d.markRefunded} errorLabel={dict.orders.errors.failed} />
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  );
}

/** Progress bar: delivery = new → confirmed → preparing → shipped → delivered; pickup has "ready for pickup" instead of shipped */
function Steps({ order, dict }: { order: AdminOrder; dict: Dictionary }) {
  const steps = STEPS[order.deliveryMethod];
  const reached = new Set(order.statusHistory.map((h) => h.status));
  const stopped = order.status === "cancelled" || order.status === "returned";
  return (
    <ol className="grid grid-cols-5 gap-1">
      {steps.map((s, i) => {
        const done = reached.has(s);
        const current = s === order.status;
        return (
          <li key={s} className="flex flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done ? "bg-gold" : "bg-border")} />
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                  done ? (stopped ? "border-[var(--status-cancel-fg)] bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]" : "border-gold bg-gold text-gold-foreground") : "border-input bg-card text-muted-foreground",
                  current && !stopped && "ring-4 ring-gold/20",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === steps.length - 1 ? "opacity-0" : reached.has(steps[i + 1]) ? "bg-gold" : "bg-border")} />
            </div>
            <span className={cn("text-xs sm:text-sm", current ? "font-bold" : "text-muted-foreground")}>{dict.status[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** History, newest first. Internal notes have a yellow background. */
function Timeline({ events, dict, locale }: { events: OrderEvent[]; dict: Dictionary; locale: Locale }) {
  const e = dict.orders.events;
  const text = (ev: OrderEvent) => {
    if (ev.type === "created") return e.created;
    if (ev.type === "status" && ev.status) return fill(e.status, { status: dict.status[ev.status] });
    if (ev.type === "payment" && ev.paymentStatus) return fill(e.payment, { payment: dict.orders.paymentStatus[ev.paymentStatus] });
    if (ev.type === "tracking") return fill(e.tracking, { note: ev.note ?? "" });
    return e.note;
  };
  return (
    <ol className="flex flex-col">
      {[...events].reverse().map((ev, i) => (
        <li key={`${ev.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", ev.type === "note" ? "bg-[var(--status-progress-fg)]" : ev.type === "created" ? "bg-muted-foreground" : "bg-gold")} />
          <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", ev.type === "note" && "rounded-lg bg-[#fcf8ef] px-3 py-2")}>
            <span className="text-sm font-semibold">{text(ev)}</span>
            {ev.note && ev.type !== "tracking" && <span className="text-sm whitespace-pre-line">{ev.note}</span>}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(ev.at, locale)} · {ev.by ? fill(dict.orders.detail.by, { name: t(ev.by, locale) }) : dict.orders.detail.system}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
