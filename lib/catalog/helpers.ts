/**
 * SMALL CATALOG HELPERS
 *   productStock(product)  -> "in_stock" | "low_stock" | "out_of_stock" | "made_to_order" for the whole product
 *   variantStatus(qty)     -> stock status of one size from its quantity
 *   slugify("Classic Ring") -> "classic-ring"  (used to suggest the product / category link)
 *   LOW_STOCK_AT           -> 2 pieces or fewer = "limited quantity" (same rule as the storefront)
 */
import type { Product, ProductStock, StockStatus } from "@/types";

export const LOW_STOCK_AT = 2;

export function variantStatus(qty: number, madeToOrder = false): StockStatus {
  if (madeToOrder) return "made_to_order";
  return qty <= 0 ? "out_of_stock" : qty <= LOW_STOCK_AT ? "low_stock" : "in_stock";
}

export function productStock(p: Pick<Product, "variants">): { qty: number; stock: ProductStock } {
  const qty = p.variants.reduce((s, v) => s + Math.max(0, v.stockQty), 0);
  if (qty === 0) return { qty, stock: p.variants.some((v) => v.stockStatus === "made_to_order") ? "made_to_order" : "out_of_stock" };
  return { qty, stock: qty <= LOW_STOCK_AT ? "low_stock" : "in_stock" };
}

/** Link-friendly text: lower case latin letters, digits and dashes. Arabic-only names give "" (type one yourself). */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
