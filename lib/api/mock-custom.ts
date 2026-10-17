/**
 * MOCK CUSTOMIZATION REQUESTS (development only) — "طلبات التخصيص"
 * ------------------------------------------------------------------
 * Only REAL requests are shown: the ones sent from the storefront's "Design your piece" page (/custom-order) on
 * your computer — when .env.local has   STOREFRONT_MOCK_DB=../storefront/.mock-db/db.json
 *   - The request itself + photos stay in the storefront's folder (.mock-db/db.json + .mock-db/custom-photos/)
 *   - Status, price and staff notes are kept in the dashboard's own .mock-db (customExtras)
 *   - Photos are shown through /api/custom-requests/photo/<file> (staff only — customers' photos are private)
 * With the real API (DATA_SOURCE=http) none of this is used: the API sends photo addresses.
 */
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CustomListQuery, CustomListResult, CustomRequest, CustomStatus, CustomSummary, CustomUpdateResult, LocalizedText } from "@/types";
import { CUSTOM_STATUSES } from "@/types";
import { mutate, read } from "./mock-db";
import { storefrontFile } from "./mock-orders";
import { matchesSearch } from "@/lib/search";

type StorefrontRequest = Omit<CustomRequest, "status" | "events" | "photos" | "email" | "quote"> & {
  email: string;
  photos: { file: string; type: string; size: number }[];
};

/** Folder with the customers' photos (next to the storefront's db.json) */
export function customPhotosDir(): string | null {
  const file = storefrontFile();
  return file ? path.join(path.dirname(file), "custom-photos") : null;
}

function storefrontRequests(): CustomRequest[] {
  const file = storefrontFile();
  if (!file || !existsSync(file)) return [];
  let list: StorefrontRequest[] = [];
  try {
    list = (JSON.parse(readFileSync(file, "utf8")) as { customRequests?: StorefrontRequest[] }).customRequests ?? [];
  } catch {
    return [];
  }
  const extras = read((db) => db.customExtras);
  return list.map(({ email, photos, ...r }) => ({
    ...r,
    email: email || undefined,
    photos: photos.map((p) => ({ url: `/api/custom-requests/photo/${encodeURIComponent(p.file)}` })),
    status: extras[r.id]?.status ?? "new",
    quote: extras[r.id]?.quote,
    events: extras[r.id]?.events ?? [],
  }));
}

/** Every request, newest first */
export function allCustomRequests(): CustomRequest[] {
  return storefrontRequests().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findCustomRequest(id: string): CustomRequest | null {
  return allCustomRequests().find((r) => r.id === id || r.reference === id) ?? null;
}

/* ---------- list ---------- */
const toSummary = (r: CustomRequest): CustomSummary => ({
  id: r.id,
  reference: r.reference,
  name: r.name,
  pieceType: r.pieceType,
  createdAt: r.createdAt,
  status: r.status,
  preview: r.description.replace(/\s+/g, " ").slice(0, 90),
  photo: r.photos[0]?.url,
  photoCount: r.photos.length,
});

export function listCustomRequests(q: CustomListQuery): CustomListResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 500);
  const base = allCustomRequests().filter((r) => {
    if (q.pieceType && r.pieceType !== q.pieceType) return false;
    return !q.q || matchesSearch(q.q, [r.name, r.phone, r.email, r.reference, r.description]);
  });
  const counts = Object.fromEntries([["all", base.length], ...CUSTOM_STATUSES.map((s) => [s, base.filter((r) => r.status === s).length])]) as CustomListResult["counts"];
  const filtered = q.status ? base.filter((r) => r.status === q.status) : base;
  return { items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSummary), total: filtered.length, page, pageSize, counts };
}

/* ---------- changes ---------- */
function apply(id: string, change: (r: CustomRequest) => void): CustomUpdateResult {
  const found = findCustomRequest(id);
  if (!found) return { ok: false, error: "not_found" };
  const r = structuredClone(found);
  change(r);
  mutate((db) => {
    db.customExtras[r.id] = { status: r.status, quote: r.quote, events: r.events };
  });
  return { ok: true, request: r };
}

/** Opening a new request moves it to "reviewing". Does nothing for other statuses. */
export const markCustomRead = (id: string) =>
  apply(id, (r) => {
    if (r.status === "new") r.status = "reviewing";
  });

/** Status change, with an optional note and (for "quoted") the price sent to the customer */
export const setCustomStatus = (id: string, change: { status: CustomStatus; note?: string; quote?: number }, by: LocalizedText) =>
  apply(id, (r) => {
    const at = new Date().toISOString();
    if (change.quote !== undefined) r.quote = change.quote;
    if (r.status !== change.status) {
      r.status = change.status;
      r.events.push({ at, type: "status", status: change.status, by });
    }
    if (change.note) r.events.push({ at, type: "note", text: change.note, by });
  });

export const addCustomNote = (id: string, note: string, by: LocalizedText) =>
  apply(id, (r) => {
    r.events.push({ at: new Date().toISOString(), type: "note", text: note, by });
  });
