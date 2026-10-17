/**
 * PAGE: /custom-requests — CUSTOMIZATION REQUESTS (طلبات التخصيص)
 * ------------------------------------------------------------------
 * Requests sent from the website's "Design your piece" page (/custom-order): the customer's photos + description.
 *   [search · piece type]
 *   [tabs: all · new · reviewing · quote sent · in work · delivered · rejected]
 *   [list with the first photo] [open request: photos, details, contact buttons, status + price, notes]
 * Phones: the list, then the open request full screen (with "back").
 * The open request is in the address: /custom-requests?r=<id> (filters too → lib/custom/query.ts)
 * Data: api.listCustomRequests() + api.getCustomRequest()
 *   - Statuses       -> types/admin.ts → CUSTOM_STATUSES
 *   - Texts          -> dictionaries → "custom"
 * Needs permission "custom" (view to see, edit to change status / add notes).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Images, Mail, MessageCircle, Phone, SearchX, UserRound } from "lucide-react";
import { CUSTOM_STATUSES, type CustomEvent, type CustomListQuery, type CustomRequest, type CustomStatus, type Locale } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatMoney, formatNumber, t } from "@/lib/format";
import { customQueryString, parseCustomQuery, PIECE_TYPES } from "@/lib/custom/query";
import { storeConfig } from "@/config/store";
import { cn } from "@/lib/utils";
import { NoAccess } from "@/components/common/NoticePage";
import { NoteForm } from "@/components/orders/NoteForm";
import { MarkRead } from "@/components/inbox/MarkRead";
import { CustomFilters } from "@/components/custom/CustomFilters";
import { CustomStatusForm } from "@/components/custom/CustomStatusForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.custom };
}

const TABS: (CustomStatus | "all")[] = ["all", ...CUSTOM_STATUSES];

/** Status colours */
const CUSTOM_TONE: Record<CustomStatus, string> = {
  new: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  reviewing: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  quoted: "bg-[var(--status-shipped-bg)] text-[var(--status-shipped-fg)]",
  in_work: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  done: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
  rejected: "bg-[var(--status-cancel-bg)] text-[var(--status-cancel-fg)]",
};

export default async function CustomRequestsPage({ searchParams }: PageProps<"/custom-requests">) {
  const session = await requireStaff();
  if (!can(session, "custom")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.custom;
  const query = parseCustomQuery(await searchParams);
  const [result, selected] = await Promise.all([api.listCustomRequests(query, session.token), query.r ? api.getCustomRequest(query.r, session.token) : Promise.resolve(null)]);

  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const open = !!query.r;
  const href = (changes: Partial<CustomListQuery>) => `/custom-requests${customQueryString(query, changes)}`;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <div className={cn("flex flex-col gap-4", open && "hidden lg:flex")}>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
        <CustomFilters
          query={query}
          types={PIECE_TYPES.map((v) => ({ value: v, label: d.types[v] }))}
          labels={{ search: d.search, searchPlaceholder: d.searchPlaceholder, typeFilter: d.typeFilter, allTypes: d.allTypes, clear: d.clear }}
        />
        <nav aria-label={d.statusFilter} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((tab) => {
            const active = (query.status ?? "all") === tab;
            return (
              <Link
                key={tab}
                href={href({ status: tab === "all" ? undefined : tab, page: 1, r: undefined })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
                  active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
                )}
              >
                {tab === "all" ? d.all : d.status[tab]}
                <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>{formatNumber(result.counts[tab], locale)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)]">
        {/* ===== List ===== */}
        <section className={cn("overflow-hidden rounded-xl border bg-card", open && "hidden lg:block")}>
          {result.items.length === 0 ? (
            <p className="p-10 text-center text-muted-foreground">{d.empty}</p>
          ) : (
            <ul className="flex flex-col">
              {result.items.map((r) => {
                const active = r.id === selected?.id;
                const unread = r.status === "new";
                return (
                  <li key={r.id} className="border-b last:border-0">
                    <Link
                      href={href({ r: r.id })}
                      aria-current={active ? "true" : undefined}
                      className={cn("flex gap-3 border-s-4 px-4 py-3 hover:bg-[#fcfaf6]", active ? "border-s-gold bg-[#fcf8ef]" : "border-s-transparent")}
                    >
                      {/* First photo (customer's own photo, served to staff only) */}
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        {r.photo && (
                          // eslint-disable-next-line @next/next/no-img-element -- private photo from a staff-only address
                          <img src={r.photo} alt="" loading="lazy" className="size-full object-cover" />
                        )}
                        {r.photoCount > 1 && <span className="absolute end-0.5 bottom-0.5 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">+{formatNumber(r.photoCount - 1, locale)}</span>}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("flex min-w-0 items-center gap-2", unread ? "font-bold" : "font-medium")}>
                            {unread && <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />}
                            <span dir="auto" className="truncate">{r.name}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(r.createdAt, locale)}</span>
                        </span>
                        <span className="flex items-center gap-2 text-sm">
                          <span className={cn("truncate", unread && "font-semibold")}>{d.types[r.pieceType]}</span>
                          <span className={cn("ms-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", CUSTOM_TONE[r.status])}>{d.status[r.status]}</span>
                        </span>
                        <span dir="auto" className="truncate text-start text-xs text-muted-foreground">{r.preview}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-sm text-muted-foreground">
              <span>{fill(d.showing, { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(result.total, locale) })}</span>
              <span className="flex gap-1">
                {result.page > 1 && (
                  <Link href={href({ page: result.page - 1, r: undefined })} className="rounded-lg px-3 py-1.5 font-semibold text-foreground hover:bg-muted">
                    {d.prev}
                  </Link>
                )}
                {result.page < pages && (
                  <Link href={href({ page: result.page + 1, r: undefined })} className="rounded-lg px-3 py-1.5 font-semibold text-foreground hover:bg-muted">
                    {d.next}
                  </Link>
                )}
              </span>
            </div>
          )}
        </section>

        {/* ===== Open request ===== */}
        {selected ? (
          <RequestView
            request={selected}
            backHref={href({ r: undefined })}
            dict={dict}
            locale={locale}
            canEdit={can(session, "custom", "edit")}
            canSeeCustomers={can(session, "customers")}
          />
        ) : query.r ? (
          <section className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
            <SearchX className="size-8 text-gold" aria-hidden />
            <p className="font-semibold">{d.notFound}</p>
            <Link href={href({ r: undefined })} className="text-sm font-semibold text-gold">
              {d.back}
            </Link>
          </section>
        ) : (
          <section className="hidden min-h-64 items-center justify-center rounded-xl border border-dashed bg-card/50 p-10 text-muted-foreground lg:flex">{d.pick}</section>
        )}
      </div>
    </div>
  );
}

function RequestView({
  request: r,
  backHref,
  dict,
  locale,
  canEdit,
  canSeeCustomers,
}: {
  request: CustomRequest;
  backHref: string;
  dict: Dictionary;
  locale: Locale;
  canEdit: boolean;
  canSeeCustomers: boolean;
}) {
  const d = dict.custom;
  const phoneDigits = r.phone.replace(/\D/g, "");
  const button = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted";
  const currency = storeConfig.currency;

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5">
      {r.status === "new" && <MarkRead id={r.id} endpoint={`/api/custom-requests/${encodeURIComponent(r.id)}/read`} />}
      <Link href={backHref} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted lg:hidden">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
        {d.back}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{d.types[r.pieceType]}</h2>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CUSTOM_TONE[r.status])}>{d.status[r.status]}</span>
          {r.quote !== undefined && <span className="rounded-full bg-[#faf3e4] px-2.5 py-0.5 text-xs font-semibold text-[#8a6420]">{fill(d.quotedPrice, { price: formatMoney(r.quote, currency, locale) })}</span>}
        </div>
        <span className="text-sm text-muted-foreground">
          {r.name} · {d.receivedAt} {formatDateTime(r.createdAt, locale)} · {d.reference} <span dir="ltr">{r.reference}</span>
        </span>
      </div>

      {/* Photos — click to open full size */}
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-1.5 font-bold">
          <Images className="size-4 text-gold" aria-hidden />
          {fill(d.photos, { n: formatNumber(r.photos.length, locale) })}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {r.photos.map((p, i) => (
            <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border bg-muted" title={d.openPhoto}>
              {/* eslint-disable-next-line @next/next/no-img-element -- private photo from a staff-only address */}
              <img src={p.url} alt={`${d.photo} ${i + 1}`} className="size-full object-cover transition-transform group-hover:scale-105" />
            </a>
          ))}
        </div>
      </div>

      {/* What the customer wants */}
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">{d.description}</h3>
        <p dir="auto" className="rounded-lg border px-4 py-3 leading-relaxed whitespace-pre-line">
          {r.description}
        </p>
        <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm sm:grid-cols-3">
          <Info label={d.pieceType} value={d.types[r.pieceType]} />
          <Info label={d.karat} value={d.karats[r.karat]} />
          <Info label={d.budget} value={r.budget ? <span dir="auto">{r.budget}</span> : <span className="text-muted-foreground">—</span>} />
        </dl>
      </div>

      {/* Customer */}
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">{d.customer}</h3>
        <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm sm:grid-cols-2">
          <Info label={d.phone} value={<span dir="ltr">{r.phone}</span>} />
          <Info label={d.email} value={r.email ? <span className="break-all">{r.email}</span> : <span className="text-muted-foreground">{d.noEmail}</span>} />
          <Info label={d.prefers} value={<b>{d.channels[r.preferredChannel]}</b>} />
          <Info label={d.language} value={d.languages[r.locale]} />
          <Info label={d.account} value={r.customerId ? d.registered : d.guest} />
        </dl>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${r.phone}`} className={button}>
            <Phone className="size-4" />
            {d.call}
          </a>
          <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className={button}>
            <MessageCircle className="size-4" />
            {d.whatsapp}
          </a>
          {r.email && (
            <a href={`mailto:${r.email}`} className={button}>
              <Mail className="size-4" />
              {d.sendEmail}
            </a>
          )}
          {canSeeCustomers && (
            <Link href={r.customerId ? `/customers/${encodeURIComponent(r.customerId)}` : `/customers?q=${encodeURIComponent(r.phone)}`} className={cn(button, "text-gold")}>
              <UserRound className="size-4" />
              {d.customerFile}
            </Link>
          )}
        </div>
      </div>

      {/* Status changes and notes */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold">{d.history}</h3>
        {r.events.length ? <History events={r.events} dict={dict} locale={locale} /> : <p className="text-sm text-muted-foreground">{d.noHistory}</p>}
      </div>

      {canEdit ? (
        <>
          <div className="border-t pt-5">
            <CustomStatusForm
              key={`${r.id}-${r.status}-${r.quote ?? ""}`}
              id={r.id}
              status={r.status}
              quote={r.quote}
              currency={currency}
              labels={{ ...d.change, statuses: d.status }}
            />
          </div>
          <div className="border-t pt-5">
            <NoteForm key={r.id} endpoint={`/api/custom-requests/${encodeURIComponent(r.id)}/notes`} labels={{ ...d.note, error: d.change.error }} />
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm">{d.viewOnly}</p>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 sm:justify-start">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}

/** Oldest first. Notes yellow, status changes small. */
function History({ events, dict, locale }: { events: CustomEvent[]; dict: Dictionary; locale: Locale }) {
  const d = dict.custom;
  return (
    <ol className="flex flex-col gap-3">
      {events.map((e, i) => {
        const who = e.by ? fill(d.by, { name: t(e.by, locale) }) : "";
        if (e.type === "status" && e.status) {
          return (
            <li key={`${e.at}-${i}`} className="text-xs text-muted-foreground">
              {fill(d.events.status, { status: d.status[e.status] })} · {formatDateTime(e.at, locale)} {who && `· ${who}`}
            </li>
          );
        }
        return (
          <li key={`${e.at}-${i}`} className="flex flex-col gap-1 rounded-lg bg-[#fcf8ef] px-4 py-3">
            <span className="text-sm font-semibold">{d.events.note}</span>
            {e.text && (
              <span dir="auto" className="text-sm leading-relaxed whitespace-pre-line">
                {e.text}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDateTime(e.at, locale)} {who && `· ${who}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
