/**
 * MOCK CONTACT MESSAGES (development only)
 * ------------------------------------------------------------------
 * Only REAL messages are shown: the ones sent from the storefront's contact form on your computer — when .env.local has
 *        STOREFRONT_MOCK_DB=../storefront/.mock-db/db.json
 *      Their status, replies and notes are kept in the dashboard's own .mock-db (messageExtras).
 * Replies "by email" are only printed in the terminal here — the real API sends them.
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import type { ContactChannel, InboxMessage, LocalizedText, MessageEvent, MessageListQuery, MessageListResult, MessageStatus, MessageSummary, MessageUpdateResult } from "@/types";
import { mutate, read } from "./mock-db";
import { storefrontFile } from "./mock-orders";
import { matchesSearch } from "@/lib/search";

/* ---------- storefront messages ---------- */
type StorefrontMessage = Omit<InboxMessage, "status" | "events" | "email"> & { email: string; website?: string };

function storefrontMessages(): InboxMessage[] {
  const file = storefrontFile();
  if (!file || !existsSync(file)) return [];
  let list: StorefrontMessage[] = [];
  try {
    list = (JSON.parse(readFileSync(file, "utf8")) as { contactMessages?: StorefrontMessage[] }).contactMessages ?? [];
  } catch {
    return [];
  }
  const extras = read((db) => db.messageExtras);
  return list.map(({ website: _bot, email, ...m }) => ({
    ...m,
    email: email || undefined,
    status: extras[m.id]?.status ?? "new",
    events: extras[m.id]?.events ?? [],
  }));
}

/** Every message, newest first */
export function allMessages(): InboxMessage[] {
  return storefrontMessages().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findMessage(id: string): InboxMessage | null {
  return allMessages().find((m) => m.id === id || m.reference === id) ?? null;
}

function saveMessage(message: InboxMessage) {
  // Status, replies and notes are kept here; the message itself stays in the storefront's file
  mutate((db) => {
    db.messageExtras[message.id] = { status: message.status, events: message.events };
  });
}

/* ---------- list ---------- */
const toSummary = (m: InboxMessage): MessageSummary => ({
  id: m.id,
  reference: m.reference,
  name: m.name,
  subject: m.subject,
  createdAt: m.createdAt,
  status: m.status,
  preferredChannel: m.preferredChannel,
  preview: m.message.replace(/\s+/g, " ").slice(0, 90),
  replied: m.events.some((e) => e.type === "reply"),
});

export function listMessages(q: MessageListQuery): MessageListResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 500);
  const base = allMessages().filter((m) => {
    if (q.subject && m.subject !== q.subject) return false;
    return !q.q || matchesSearch(q.q, [m.name, m.phone, m.email, m.reference, m.message]);
  });
  const counts = {
    all: base.length,
    new: base.filter((m) => m.status === "new").length,
    open: base.filter((m) => m.status === "open").length,
    done: base.filter((m) => m.status === "done").length,
  };
  const filtered = q.status ? base.filter((m) => m.status === q.status) : base;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary), total: filtered.length, page, pageSize, counts };
}

/* ---------- changes ---------- */
function apply(id: string, change: (m: InboxMessage) => MessageUpdateResult): MessageUpdateResult {
  const message = findMessage(id);
  if (!message) return { ok: false, error: "not_found" };
  const result = change(structuredClone(message));
  if (result.ok) saveMessage(result.message);
  return result;
}

/** Opening a new message moves it to "open" (read). Does nothing for other statuses. */
export const markMessageRead = (id: string) =>
  apply(id, (m) => {
    if (m.status === "new") m.status = "open";
    return { ok: true, message: m };
  });

export const setMessageStatus = (id: string, status: MessageStatus, by: LocalizedText) =>
  apply(id, (m) => {
    if (m.status !== status) {
      m.status = status;
      m.events.push({ at: new Date().toISOString(), type: "status", status, by });
    }
    return { ok: true, message: m };
  });

export const replyToMessage = (id: string, reply: { channel: ContactChannel; text: string; markDone?: boolean }, by: LocalizedText) =>
  apply(id, (m) => {
    if (reply.channel === "email" && !m.email) return { ok: false, error: "no_email" };
    const now = new Date().toISOString();
    m.events.push({ at: now, type: "reply", channel: reply.channel, text: reply.text, by });
    if (reply.channel === "email") console.info(`[mock] would email ${m.email} (${m.locale}): reply to ${m.reference}`);
    if (m.status === "new") m.status = "open";
    if (reply.markDone && m.status !== "done") {
      m.status = "done";
      m.events.push({ at: now, type: "status", status: "done", by });
    }
    return { ok: true, message: m };
  });

export const addMessageNote = (id: string, note: string, by: LocalizedText) =>
  apply(id, (m) => {
    m.events.push({ at: new Date().toISOString(), type: "note", text: note, by });
    return { ok: true, message: m };
  });
