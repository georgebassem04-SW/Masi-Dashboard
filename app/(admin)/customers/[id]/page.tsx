/**
 * PAGE: /customers/<id> — CUSTOMER FILE (design screen 17)
 * ------------------------------------------------------------------
 *   [← Customers   avatar · name · badge · customer since      call · WhatsApp · email · stop account]
 *   [orders count] [total spent] [average order] [last order]
 *   [orders table]                  [account details]
 *   [staff notes + add note]        [addresses]
 * Data: api.getCustomer(). Changes go through /api/customers/<id>/… (components/customers/*).
 *   - Texts: dictionaries → "customers"
 * Needs permission "customers" (view to see, edit to add notes / stop the account).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail, MessageCircle, Phone, SearchX } from "lucide-react";
import type { CustomerNote, Locale } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDate, formatDateTime, formatMoney, formatNumber, t } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/common/Card";
import { NoAccess, NoticePage } from "@/components/common/NoticePage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatCard } from "@/components/overview/StatCard";
import { PaymentBadge } from "@/components/orders/PaymentBadge";
import { NoteForm } from "@/components/orders/NoteForm";
import { CustomerAvatar, KindBadge } from "@/components/customers/CustomerBits";
import { CustomerAccountAction } from "@/components/customers/CustomerAccountAction";

export async function generateMetadata({ params }: PageProps<"/customers/[id]">): Promise<Metadata> {
  const session = await requireStaff();
  const customer = can(session, "customers") ? await api.getCustomer(decodeURIComponent((await params).id), session.token) : null;
  return { title: customer?.name ?? (await getDictionary(await getLocale())).nav.customers };
}

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const session = await requireStaff();
  if (!can(session, "customers")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.customers.detail;
  const customer = await api.getCustomer(decodeURIComponent((await params).id), session.token);
  if (!customer) return <NoticePage icon={SearchX} title={d.notFound} backLabel={d.back} />;

  const canEdit = can(session, "customers", "edit");
  const canSeeOrders = can(session, "orders");
  const money = (n: number) => formatMoney(n, customer.currency, locale);
  const phoneDigits = customer.phone.replace(/[^\d]/g, "");
  const button = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted";

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {/* ===== Header ===== */}
      <div className="flex flex-col gap-4">
        <Link href="/customers" className="inline-flex h-10 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {d.back}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <CustomerAvatar name={customer.name} url={customer.avatarUrl} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{customer.name}</h2>
              <KindBadge customer={customer} labels={dict.customers} />
            </div>
            <span className="text-sm text-muted-foreground">{fill(customer.kind === "guest" ? d.guestSince : d.since, { date: formatDate(customer.createdAt, locale, "month") })}</span>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${customer.phone}`} className={button}>
              <Phone className="size-4" />
              {d.call}
            </a>
            <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className={button}>
              <MessageCircle className="size-4" />
              {d.whatsapp}
            </a>
            {customer.email && (
              <a href={`mailto:${customer.email}`} className={button}>
                <Mail className="size-4" />
                {d.sendEmail}
              </a>
            )}
            {canEdit && customer.kind === "registered" && (
              <CustomerAccountAction customerId={customer.id} name={customer.name} disabled={customer.disabled} labels={{ actions: dict.customers.actions, errors: dict.customers.errors }} />
            )}
          </div>
        </div>
        {customer.disabled && <p className="rounded-lg bg-[var(--status-cancel-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-cancel-fg)]">{d.disabledNotice}</p>}
        {customer.kind === "guest" && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{d.guestInfo}</p>}
        {!canEdit && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{d.viewOnly}</p>}
      </div>

      {/* ===== Numbers ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={d.stats.orders} value={formatNumber(customer.ordersCount, locale)} />
        <StatCard label={d.stats.spent} value={money(customer.totalSpent)} note={d.spentNote} />
        <StatCard label={d.stats.average} value={customer.averageOrder ? money(customer.averageOrder) : "—"} />
        <StatCard label={d.stats.lastOrder} value={customer.lastOrderAt ? formatDateTime(customer.lastOrderAt, locale) : "—"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ===== Main column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={`${d.orders} (${formatNumber(customer.ordersCount, locale)})`}>
            {customer.orders.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-muted-foreground">{d.noOrders}</p>
            ) : (
              <ul className="flex flex-col">
                {customer.orders.map((o) => {
                  const row = (
                    <>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span dir="ltr" className="self-start font-bold">
                          {o.number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(o.createdAt, locale)} · {formatNumber(o.itemsCount, locale)} {dict.orders.columns.items}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold whitespace-nowrap">{formatMoney(o.total, o.currency, locale)}</span>
                        <span className="flex flex-wrap justify-end gap-1">
                          <StatusBadge status={o.status} label={dict.status[o.status]} />
                          {o.paymentStatus && <PaymentBadge status={o.paymentStatus} label={dict.orders.paymentStatus[o.paymentStatus]} />}
                        </span>
                      </span>
                    </>
                  );
                  const cls = "flex items-center justify-between gap-3 border-t px-5 py-3";
                  return (
                    <li key={o.id}>
                      {canSeeOrders ? (
                        <Link href={`/orders/${encodeURIComponent(o.id)}`} className={cn(cls, "hover:bg-[#fcfaf6]")}>
                          {row}
                        </Link>
                      ) : (
                        <div className={cls}>{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={d.notes}>
            <div className="flex flex-col gap-5 px-5 pb-5">
              {customer.notes.length ? <Notes notes={customer.notes} dict={dict} locale={locale} /> : <p className="text-sm text-muted-foreground">{d.noNotes}</p>}
              {canEdit && (
                <NoteForm
                  endpoint={`/api/customers/${encodeURIComponent(customer.id)}/notes`}
                  labels={{ addNote: d.addNote, notePlaceholder: d.notePlaceholder, saveNote: d.saveNote, error: dict.customers.errors.failed }}
                />
              )}
            </div>
          </Card>
        </div>

        {/* ===== Side column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title={d.account}>
            <dl className="flex flex-col gap-2.5 px-5 pb-5 text-sm">
              <Row label={d.phone} value={<span dir="ltr">{customer.phone}</span>} />
              <Row label={d.email} value={customer.email ? <span className="break-all">{customer.email}</span> : d.none} />
              {customer.kind === "registered" && (
                <>
                  <Row label={d.signInWith} value={customer.signInWith.map((s) => dict.customers.signIn[s]).join("، ") || d.none} />
                  <Row label={d.memberSince} value={formatDate(customer.createdAt, locale)} />
                  <Row label={d.marketing} value={customer.marketingOptIn ? d.marketingYes : d.marketingNo} />
                  {customer.birthDate && <Row label={d.birthday} value={formatDate(customer.birthDate, locale)} />}
                </>
              )}
              {customer.preferredLocale && <Row label={d.language} value={d.languages[customer.preferredLocale]} />}
              <Row label={d.coupons} value={customer.couponsUsed.length ? <span dir="ltr">{customer.couponsUsed.join(", ")}</span> : d.none} />
            </dl>
          </Card>

          <Card title={`${d.addresses} (${formatNumber(customer.addresses.length, locale)})`}>
            {customer.addresses.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted-foreground">{d.noAddresses}</p>
            ) : (
              <ul className="flex flex-col gap-3 px-5 pb-5 text-sm">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 rounded-lg border px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {customer.kind === "guest" ? fill(d.fromOrder, { number: a.label }) : a.label}
                      {a.isDefault && customer.kind === "registered" && <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-gold">{d.default}</span>}
                    </span>
                    <span>{[a.street, a.building, a.area, a.city].filter(Boolean).join("، ")}</span>
                    {a.notes && <span className="text-muted-foreground">{a.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end">{value}</dd>
    </div>
  );
}

/** Staff notes, newest first. Stopping / reactivating the account also shows here. */
function Notes({ notes, dict, locale }: { notes: CustomerNote[]; dict: Dictionary; locale: Locale }) {
  const e = dict.customers.detail.events;
  return (
    <ol className="flex flex-col">
      {[...notes].reverse().map((n, i) => (
        <li key={`${n.at}-${i}`} className="flex gap-3 pb-4 last:pb-0">
          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.type === "disabled" ? "bg-[var(--status-cancel-fg)]" : n.type === "enabled" ? "bg-[var(--status-done-fg)]" : "bg-[var(--status-progress-fg)]")} />
          <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-3 py-2", n.type === "disabled" ? "bg-[var(--status-cancel-bg)]" : "bg-[#fcf8ef]")}>
            <span className="text-sm font-semibold">{e[n.type]}</span>
            {n.note && <span className="text-sm whitespace-pre-line">{n.note}</span>}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(n.at, locale)}
              {n.by && ` · ${fill(dict.customers.detail.by, { name: t(n.by, locale) })}`}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
