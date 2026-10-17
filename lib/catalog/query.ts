/**
 * PRODUCTS LIST FILTERS <-> PAGE ADDRESS
 * e.g. /products?categoryId=cat-rings&karat=21&stock=low_stock&visibility=hidden&q=خاتم&sort=price_asc&page=2
 */
import type { Karat, ProductListQuery } from "@/types";

export const KARATS: Karat[] = [24, 22, 21, 18, 14];
export const PRODUCT_SORTS = ["newest", "name", "price_asc", "price_desc", "stock_asc"] as const;
export const STOCK_FILTERS = ["in_stock", "low_stock", "out_of_stock"] as const;
export const PRODUCTS_PAGE_SIZE = 20;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseProductQuery(raw: Raw): ProductListQuery {
  const karat = Number(one(raw.karat)) as Karat;
  const stock = one(raw.stock) as (typeof STOCK_FILTERS)[number];
  const sort = one(raw.sort) as (typeof PRODUCT_SORTS)[number];
  const visibility = one(raw.visibility);
  const page = Math.floor(Number(one(raw.page)) || 1);
  return {
    q: one(raw.q).trim().slice(0, 80) || undefined,
    categoryId: one(raw.categoryId).slice(0, 60) || undefined,
    karat: KARATS.includes(karat) ? karat : undefined,
    stock: STOCK_FILTERS.includes(stock) ? stock : undefined,
    visibility: visibility === "visible" || visibility === "hidden" ? visibility : undefined,
    sort: PRODUCT_SORTS.includes(sort) && sort !== "newest" ? sort : undefined,
    page: page > 0 ? page : 1,
    pageSize: PRODUCTS_PAGE_SIZE,
  };
}

export function productQueryString(q: ProductListQuery, changes: Partial<ProductListQuery> = {}): string {
  const m = { ...q, ...changes };
  const p = new URLSearchParams();
  if (m.q) p.set("q", m.q);
  if (m.categoryId) p.set("categoryId", m.categoryId);
  if (m.karat) p.set("karat", String(m.karat));
  if (m.stock) p.set("stock", m.stock);
  if (m.visibility) p.set("visibility", m.visibility);
  if (m.sort && m.sort !== "newest") p.set("sort", m.sort);
  if (m.page && m.page > 1) p.set("page", String(m.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
