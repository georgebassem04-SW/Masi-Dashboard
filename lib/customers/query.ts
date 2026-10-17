/**
 * CUSTOMERS LIST FILTERS <-> PAGE ADDRESS
 * The list keeps its filters in the address, e.g. /customers?segment=repeat&sort=spent&q=reem&page=2
 * (bookmarkable, shareable, Back button works).
 *   parseCustomerQuery(searchParams) -> CustomerListQuery (unknown values are ignored)
 *   customerQueryString(query, changes) -> "?segment=…&…" for links
 */
import type { CustomerListQuery, CustomerSegment, CustomerSort } from "@/types";

/** Tabs, in the order they appear */
export const SEGMENTS: CustomerSegment[] = ["all", "registered", "guest", "repeat", "disabled"];
/** Sort options, the first one is the default */
export const SORTS: CustomerSort[] = ["newest", "spent", "orders", "last_order"];
export const CUSTOMERS_PAGE_SIZE = 20;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseCustomerQuery(raw: Raw): CustomerListQuery {
  const segment = one(raw.segment) as CustomerSegment;
  const sort = one(raw.sort) as CustomerSort;
  const page = Math.floor(Number(one(raw.page)) || 1);
  return {
    segment: SEGMENTS.includes(segment) && segment !== "all" ? segment : undefined,
    sort: SORTS.includes(sort) && sort !== "newest" ? sort : undefined,
    marketing: one(raw.marketing) === "1" ? true : undefined,
    q: one(raw.q).trim().slice(0, 80) || undefined,
    page: page > 0 ? page : 1,
    pageSize: CUSTOMERS_PAGE_SIZE,
  };
}

export function customerQueryString(q: CustomerListQuery, changes: Partial<CustomerListQuery> = {}): string {
  const m = { ...q, ...changes };
  const params = new URLSearchParams();
  if (m.segment && m.segment !== "all") params.set("segment", m.segment);
  if (m.q) params.set("q", m.q);
  if (m.sort && m.sort !== "newest") params.set("sort", m.sort);
  if (m.marketing) params.set("marketing", "1");
  if (m.page && m.page > 1) params.set("page", String(m.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
