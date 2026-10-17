/**
 * PAGE: /inbox — CONTACT MESSAGES (design screen 12)
 * ------------------------------------------------------------------
 * Messages sent from the website's "Contact us" form.
 *   [search · subject]
 *   [tabs: الكل · جديدة · بانتظار الرد · تم التعامل معها]
 *   [message list] [open message: sender, message, replies & notes, reply box]
 * Phones: the list, and the open message full screen (with "back").
 * The open message is in the address: /inbox?m=<id> (filters too → lib/inbox/query.ts)
 * Data: api.listMessages() + api.getMessage() — messages from the website's contact form.
 *   - Subject names  -> config/contact-subjects.ts
 *   - Ready replies  -> config/reply-templates.ts
 *   - Texts          -> dictionaries → "inbox"
 * Needs permission "inbox" (view to read, edit to reply / change status).
 */
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCheck, Mail, MessageCircle, Phone, SearchX, UserRound } from "lucide-react";
import type { InboxMessage, Locale, MessageEvent, MessageStatus } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { fill, formatDateTime, formatNumber, t } from "@/lib/format";
import { inboxQueryString, parseInboxQuery, type InboxQuery } from "@/lib/inbox/query";
import { getContactSubjects, labelFor } from "@/lib/inbox/subjects";
import { REPLY_TEMPLATES } from "@/config/reply-templates";
import { cn } from "@/lib/utils";
import { NoAccess } from "@/components/common/NoticePage";
import { NoteForm } from "@/components/orders/NoteForm";
import { InboxFilters } from "@/components/inbox/InboxFilters";
import { MarkRead } from "@/components/inbox/MarkRead";
import { MessageStatusButton } from "@/components/inbox/MessageStatusButton";
import { ReplyBox } from "@/components/inbox/ReplyBox";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.inbox };
}

const TABS: (MessageStatus | "all")[] = ["all", "new", "open", "done"];

/** Status colours: new = blue, awaiting reply = amber, handled = green */
const STATUS_TONE: Record<MessageStatus, string> = {
  new: "bg-[var(--status-new-bg)] text-[var(--status-new-fg)]",
  open: "bg-[var(--status-progress-bg)] text-[var(--status-progress-fg)]",
  done: "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]",
};

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const session = await requireStaff();
  if (!can(session, "inbox")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const d = dict.inbox;
  const query = parseInboxQuery(await searchParams);
  const [result, selected, subjects] = await Promise.all([
    api.listMessages(query, session.token),
    query.m ? api.getMessage(query.m, session.token) : Promise.resolve(null),
    getContactSubjects(session.token),
  ]);
  const subjectLabel = (value: string) => labelFor(subjects, value);

  const from = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const to = Math.min(result.page * result.pageSize, result.total);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const open = !!query.m; // a message is open → on phones show only the message

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <div className={cn("flex flex-col gap-4", open && "hidden lg:flex")}>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
        <InboxFilters
          query={query}
          subjects={subjects.map((s) => ({ value: s.value, label: t(s.label, locale) }))}
          labels={{ search: d.search, searchPlaceholder: d.searchPlaceholder, subjectFilter: d.subjectFilter, allSubjects: d.allSubjects, clear: d.clear }}
        />
        <nav aria-label={d.subjectFilter} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((tab) => {
            const active = (query.status ?? "all") === tab;
            return (
              <Link
                key={tab}
                href={`/inbox${inboxQueryString(query, { status: tab === "all" ? undefined : tab, page: 1, m: undefined })}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap",
                  active ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-input bg-card hover:bg-muted",
                )}
              >
                {d.tabs[tab]}
                <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>{formatNumber(result.counts[tab], locale)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        {/* ===== List ===== */}
        <section className={cn("overflow-hidden rounded-xl border bg-card", open && "hidden lg:block")}>
          {result.items.length === 0 ? (
            <p className="p-10 text-center text-muted-foreground">{d.empty}</p>
          ) : (
            <ul className="flex flex-col">
              {result.items.map((m) => {
                const active = m.id === selected?.id;
                const unread = m.status === "new";
                return (
                  <li key={m.id} className="border-b last:border-0">
                    <Link
                      href={`/inbox${inboxQueryString(query, { m: m.id })}`}
                      aria-current={active ? "true" : undefined}
                      className={cn("flex flex-col gap-1 border-s-4 px-4 py-3 hover:bg-[#fcfaf6]", active ? "border-s-gold bg-[#fcf8ef]" : "border-s-transparent")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("flex min-w-0 items-center gap-2", unread ? "font-bold" : "font-medium")}>
                          {unread && <span className="size-2 shrink-0 rounded-full bg-gold" aria-hidden />}
                          <span dir="auto" className="truncate">{m.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(m.createdAt, locale)}</span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className={cn("truncate", unread && "font-semibold")}>{t(subjectLabel(m.subject), locale)}</span>
                        {m.replied && <CheckCheck className="size-4 shrink-0 text-[var(--status-done-fg)]" aria-label={d.replied} />}
                        {m.status === "done" && <span className={cn("ms-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_TONE.done)}>{d.status.done}</span>}
                      </span>
                      <span dir="auto" className="truncate text-start text-xs text-muted-foreground">{m.preview}</span>
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
                  <Link href={`/inbox${inboxQueryString(query, { page: result.page - 1, m: undefined })}`} className="rounded-lg px-3 py-1.5 font-semibold text-foreground hover:bg-muted">
                    {d.prev}
                  </Link>
                )}
                {result.page < pages && (
                  <Link href={`/inbox${inboxQueryString(query, { page: result.page + 1, m: undefined })}`} className="rounded-lg px-3 py-1.5 font-semibold text-foreground hover:bg-muted">
                    {d.next}
                  </Link>
                )}
              </span>
            </div>
          )}
        </section>

        {/* ===== Open message ===== */}
        {selected ? (
          <MessageView message={selected} subjectName={t(subjectLabel(selected.subject), locale)} query={query} dict={dict} locale={locale} canEdit={can(session, "inbox", "edit")} canSeeCustomers={can(session, "customers")} storeName={(await api.getPublishedTheme()).brand.name} />
        ) : query.m ? (
          <section className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
            <SearchX className="size-8 text-gold" aria-hidden />
            <p className="font-semibold">{d.detail.notFound}</p>
            <Link href={`/inbox${inboxQueryString(query, { m: undefined })}`} className="text-sm font-semibold text-gold">
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

async function MessageView({
  message: m,
  subjectName,
  query,
  dict,
  locale,
  canEdit,
  canSeeCustomers,
  storeName,
}: {
  message: InboxMessage;
  subjectName: string;
  query: InboxQuery;
  dict: Dictionary;
  locale: Locale;
  canEdit: boolean;
  canSeeCustomers: boolean;
  storeName: { ar: string; en: string };
}) {
  const d = dict.inbox;
  const dd = d.detail;
  const branches = m.branchId ? await api.getBranches() : [];
  const branch = branches.find((b) => b.id === m.branchId);
  const phoneDigits = m.phone.replace(/\D/g, "");
  const firstName = m.name.trim().split(/\s+/)[0] ?? m.name;
  // Ready replies in the VISITOR's language
  const templates = REPLY_TEMPLATES.map((tpl) => ({
    key: tpl.key,
    title: t(tpl.title, locale),
    text: fill(tpl.text[m.locale], { name: firstName, store: storeName[m.locale] }),
  }));
  const button = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted";

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5">
      {m.status === "new" && <MarkRead id={m.id} />}
      <Link href={`/inbox${inboxQueryString(query, { m: undefined })}`} className="inline-flex h-9 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted lg:hidden">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
        {d.back}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{subjectName}</h2>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONE[m.status])}>{d.status[m.status]}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {m.name} · {dd.receivedAt} {formatDateTime(m.createdAt, locale)} · {dd.reference} <span dir="ltr">{m.reference}</span>
          </span>
        </div>
        {canEdit && <MessageStatusButton id={m.id} status={m.status} labels={{ done: d.actions.done, reopen: d.actions.reopen, error: d.errors.failed }} />}
      </div>

      {/* Sender */}
      <dl className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/60 px-4 py-3 text-sm sm:grid-cols-2">
        <Info label={dd.phone} value={<span dir="ltr">{m.phone}</span>} />
        <Info label={dd.email} value={m.email ? <span className="break-all">{m.email}</span> : <span className="text-muted-foreground">{dd.noEmail}</span>} />
        <Info label={dd.prefers} value={<b>{d.channels[m.preferredChannel]}</b>} />
        <Info label={dd.language} value={dd.languages[m.locale]} />
        {branch && <Info label={dd.branch} value={t(branch.name, locale)} />}
        {m.pageUrl && <Info label={dd.sentFrom} value={<span dir="ltr" className="break-all">{safePath(m.pageUrl)}</span>} />}
      </dl>
      <div className="flex flex-wrap gap-2">
        <a href={`tel:${m.phone}`} className={button}>
          <Phone className="size-4" />
          {dd.call}
        </a>
        <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className={button}>
          <MessageCircle className="size-4" />
          {dd.whatsapp}
        </a>
        {m.email && (
          <a href={`mailto:${m.email}`} className={button}>
            <Mail className="size-4" />
            {dd.sendEmail}
          </a>
        )}
        {canSeeCustomers && (
          <Link href={`/customers?q=${encodeURIComponent(m.phone)}`} className={cn(button, "text-gold")}>
            <UserRound className="size-4" />
            {dd.customerFile}
          </Link>
        )}
      </div>

      {/* The message */}
      <p dir="auto" className="rounded-lg border px-4 py-3 leading-relaxed whitespace-pre-line">
        {m.message}
      </p>

      {/* Replies, notes, status changes */}
      <div className="flex flex-col gap-3">
        <h3 className="font-bold">{dd.history}</h3>
        {m.events.length ? <History events={m.events} dict={dict} locale={locale} /> : <p className="text-sm text-muted-foreground">{dd.noHistory}</p>}
      </div>

      {canEdit ? (
        <>
          <div className="flex flex-col gap-3 border-t pt-5">
            <h3 className="font-bold">{d.reply.title}</h3>
            <ReplyBox
              key={m.id}
              id={m.id}
              phone={m.phone}
              email={m.email}
              preferred={m.preferredChannel}
              languageName={dd.languages[m.locale]}
              templates={templates}
              labels={{ ...d.reply, channels: d.channels, errors: d.errors }}
            />
          </div>
          <div className="border-t pt-5">
            <NoteForm key={m.id} endpoint={`/api/inbox/${encodeURIComponent(m.id)}/notes`} labels={{ ...d.note, error: d.errors.failed }} />
          </div>
        </>
      ) : (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm">{dd.viewOnly}</p>
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

/** Only the path of the page the visitor wrote from (e.g. /ar/contact) — never a clickable outside link */
function safePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.slice(0, 80);
  }
}

/** Oldest first, like a conversation. Replies green, notes yellow, status changes small. */
function History({ events, dict, locale }: { events: MessageEvent[]; dict: Dictionary; locale: Locale }) {
  const d = dict.inbox;
  return (
    <ol className="flex flex-col gap-3">
      {events.map((e, i) => {
        const who = e.by ? fill(d.detail.by, { name: t(e.by, locale) }) : "";
        if (e.type === "status" && e.status) {
          return (
            <li key={`${e.at}-${i}`} className="text-xs text-muted-foreground">
              {fill(d.events.status, { status: d.status[e.status] })} · {formatDateTime(e.at, locale)} {who && `· ${who}`}
            </li>
          );
        }
        return (
          <li key={`${e.at}-${i}`} className={cn("flex flex-col gap-1 rounded-lg px-4 py-3", e.type === "reply" ? "bg-[var(--status-done-bg)]/60" : "bg-[#fcf8ef]")}>
            <span className="text-sm font-semibold">{e.type === "reply" ? fill(d.events.reply, { channel: d.channels[e.channel ?? "email"] }) : d.events.note}</span>
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
