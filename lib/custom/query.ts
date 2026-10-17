/**
 * CUSTOMIZATION REQUESTS FILTERS <-> PAGE ADDRESS
 * e.g. /custom-requests?status=quoted&type=ring&q=sara&r=cus_12
 *   r = the request open on the right (on phones: shown full screen)
 */
import { CUSTOM_STATUSES, type CustomListQuery, type CustomPieceType, type CustomStatus } from "@/types";

export const PIECE_TYPES: CustomPieceType[] = ["ring", "necklace", "bracelet", "earrings", "set", "other"];
export const CUSTOM_PAGE_SIZE = 25;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseCustomQuery(raw: Raw): CustomListQuery {
  const status = one(raw.status) as CustomStatus;
  const type = one(raw.type) as CustomPieceType;
  const page = Math.floor(Number(one(raw.page)) || 1);
  return {
    status: CUSTOM_STATUSES.includes(status) ? status : undefined,
    pieceType: PIECE_TYPES.includes(type) ? type : undefined,
    q: one(raw.q).trim().slice(0, 80) || undefined,
    r: one(raw.r).slice(0, 60) || undefined,
    page: page > 0 ? page : 1,
    pageSize: CUSTOM_PAGE_SIZE,
  };
}

export function customQueryString(q: CustomListQuery, changes: Partial<CustomListQuery> = {}): string {
  const m = { ...q, ...changes };
  const params = new URLSearchParams();
  if (m.status) params.set("status", m.status);
  if (m.pieceType) params.set("type", m.pieceType);
  if (m.q) params.set("q", m.q);
  if (m.page && m.page > 1) params.set("page", String(m.page));
  if (m.r) params.set("r", m.r);
  const s = params.toString();
  return s ? `?${s}` : "";
}
