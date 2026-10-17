/**
 * INBOX FILTERS <-> PAGE ADDRESS
 * e.g. /inbox?status=open&subject=order&q=sara&m=msg_12
 *   m = the message open on the right (on phones: shown full screen)
 */
import type { MessageListQuery, MessageStatus } from "@/types";

export const MESSAGE_STATUSES: MessageStatus[] = ["new", "open", "done"];
export const INBOX_PAGE_SIZE = 25;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export type InboxQuery = MessageListQuery & { m?: string };

export function parseInboxQuery(raw: Raw): InboxQuery {
  const status = one(raw.status) as MessageStatus;
  const subject = one(raw.subject);
  const page = Math.floor(Number(one(raw.page)) || 1);
  return {
    status: MESSAGE_STATUSES.includes(status) ? status : undefined,
    // Any subject code (the list is edited in Site pages → Contact us); only safe characters are kept
    subject: /^[a-z0-9_-]{1,40}$/.test(subject) ? subject : undefined,
    q: one(raw.q).trim().slice(0, 80) || undefined,
    m: one(raw.m).slice(0, 60) || undefined,
    page: page > 0 ? page : 1,
    pageSize: INBOX_PAGE_SIZE,
  };
}

export function inboxQueryString(q: InboxQuery, changes: Partial<InboxQuery> = {}): string {
  const m = { ...q, ...changes };
  const params = new URLSearchParams();
  if (m.status) params.set("status", m.status);
  if (m.subject) params.set("subject", m.subject);
  if (m.q) params.set("q", m.q);
  if (m.page && m.page > 1) params.set("page", String(m.page));
  if (m.m) params.set("m", m.m);
  const s = params.toString();
  return s ? `?${s}` : "";
}
