/**
 * MOCK PRODUCTS & CATEGORIES (development only)
 * ------------------------------------------------------------------
 * - mock-data/products.json plays the role of the ERP: the first time, its products are copied into
 *   .mock-db/db.json as "ERP products" (SKU, weight and stock locked in the dashboard).
 *   "Sync with ERP" copies weight / stock / SKU from that file again (edit the file to simulate the ERP).
 * - Products added with "+ Add product" are "manual" products: everything is editable, and they can be deleted.
 * - mock-data/categories.json is copied the same way; categories are fully managed here.
 * - Stock follows website orders (ordered = less stock, cancelled / returned = back): mock-stock.ts
 * - The storefront (DASHBOARD_URL in its .env.local) reads publicCatalog(): visible products + visible categories.
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type {
  AdminBrand,
  AdminCategory,
  Brand,
  BrandInput,
  BrandSaveResult,
  AdminProduct,
  Category,
  CategoryInput,
  CategorySaveResult,
  GoldPrice,
  Product,
  ProductInput,
  ProductListQuery,
  ProductListResult,
  ProductSaveResult,
  ProductSummary,
  PublicCatalog,
} from "@/types";
import { mutate, read } from "./mock-db";
import { applyOrderStock, reapplyOpenOrders } from "./mock-stock";
import { startingPrice } from "@/lib/catalog/pricing";
import { productStock, variantStatus } from "@/lib/catalog/helpers";
import { matchesSearch } from "@/lib/search";
import { storeConfig } from "@/config/store";
import productsJson from "@/mock-data/products.json";
import categoriesJson from "@/mock-data/categories.json";
import brandsJson from "@/mock-data/brands.json";

type StoredCategory = Category & { visible: boolean };
const erpProducts = productsJson as unknown as Product[];

/* ---------- load (first time: copy the sample files) ---------- */
export function allProducts(): AdminProduct[] {
  if (!read((db) => db.products)) mutate((db) => (db.products ??= erpProducts.map((p) => ({ ...p, visible: true, source: "erp" as const, updatedAt: p.createdAt }))));
  // Orders placed on the website take their pieces out of the stock (once); cancelled / returned give them back
  applyOrderStock();
  return read((db) => db.products)!;
}

function storedCategories(): StoredCategory[] {
  const existing = read((db) => db.categories);
  if (existing) return existing;
  return mutate((db) => (db.categories ??= (categoriesJson as Category[]).map((c) => ({ ...c, visible: true }))));
}

export function findProduct(id: string): AdminProduct | null {
  return allProducts().find((p) => p.id === id || p.slug === id) ?? null;
}

/* ---------- products list ---------- */
function toSummary(p: AdminProduct, gold: GoldPrice[]): ProductSummary {
  const weights = p.variants.map((v) => v.weightGrams);
  const { qty, stock } = productStock(p);
  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    imageUrl: p.images[0]?.url,
    categoryId: p.categoryId,
    karat: p.karat,
    metal: p.metal,
    minWeight: weights.length ? Math.min(...weights) : 0,
    maxWeight: weights.length ? Math.max(...weights) : 0,
    variantsCount: p.variants.length,
    stockQty: qty,
    stock,
    price: startingPrice(p, gold),
    visible: p.visible,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    source: p.source,
  };
}

export function listProducts(q: ProductListQuery, gold: GoldPrice[]): ProductListResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 5000);
  const summaries = allProducts().map((p) => ({ p, s: toSummary(p, gold) }));

  // Search + category + karat apply to the counts too; stock / visibility are the "tabs"
  const base = summaries.filter(({ p }) => {
    if (q.categoryId && p.categoryId !== q.categoryId) return false;
    if (q.karat && p.karat !== q.karat) return false;
    return !q.q || matchesSearch(q.q, [p.name.ar, p.name.en, p.sku, ...p.variants.map((v) => v.sku), ...p.tags]);
  });
  const counts = {
    all: base.length,
    visible: base.filter(({ p }) => p.visible).length,
    hidden: base.filter(({ p }) => !p.visible).length,
    out_of_stock: base.filter(({ s }) => s.stock === "out_of_stock").length,
  };
  const filtered = base
    .filter(({ p, s }) => {
      if (q.visibility === "visible" && !p.visible) return false;
      if (q.visibility === "hidden" && p.visible) return false;
      return !q.stock || s.stock === q.stock;
    })
    .sort((a, b) => {
      if (q.sort === "name") return a.p.name.ar.localeCompare(b.p.name.ar, "ar");
      if (q.sort === "price_asc") return a.s.price - b.s.price;
      if (q.sort === "price_desc") return b.s.price - a.s.price;
      if (q.sort === "stock_asc") return a.s.stockQty - b.s.stockQty;
      return b.p.createdAt.localeCompare(a.p.createdAt);
    });

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(({ s }) => s),
    total: filtered.length,
    page,
    pageSize,
    counts,
    currency: storeConfig.currency,
    lastSyncAt: read((db) => db.lastSyncAt),
  };
}

/* ---------- product changes ---------- */
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

function checkUnique(list: AdminProduct[], input: ProductInput, selfId?: string): ProductSaveResult | null {
  if (list.some((p) => p.id !== selfId && p.slug === input.slug)) return { ok: false, error: "slug_taken" };
  const skus = new Set(list.filter((p) => p.id !== selfId).flatMap((p) => [p.sku, ...p.variants.map((v) => v.sku)]));
  if (skus.has(input.sku) || input.variants.some((v) => skus.has(v.sku))) return { ok: false, error: "sku_taken" };
  if (!storedCategories().some((c) => c.id === input.categoryId)) return { ok: false, error: "category_missing" };
  return null;
}

/** Sizes typed in the dashboard (manual products): new ids for new rows, stock status from the quantity */
function cleanVariants(productId: string, input: ProductInput["variants"]) {
  return input.map((v, i) => ({
    ...v,
    id: v.id && !v.id.startsWith("new") ? v.id : `${productId}-v${i + 1}-${crypto.randomUUID().slice(0, 4)}`,
    stockStatus: variantStatus(v.stockQty, v.stockStatus === "made_to_order"),
  }));
}

/** The product's collection, or nothing when none was chosen (or it was deleted meanwhile) */
const knownBrand = (id?: string) => (id && storedBrands().some((b) => b.id === id) ? id : undefined);

export function createProduct(input: ProductInput): ProductSaveResult {
  input = { ...input, brandId: knownBrand(input.brandId) };
  return mutate((db) => {
    const list = (db.products ??= allProducts());
    const problem = checkUnique(list, input);
    if (problem) return problem;
    const id = newId("p");
    const now = new Date().toISOString();
    const product: AdminProduct = { ...input, id, variants: cleanVariants(id, input.variants), source: "manual", createdAt: now, updatedAt: now };
    list.push(product);
    return { ok: true as const, product };
  });
}

export function updateProduct(id: string, input: ProductInput): ProductSaveResult {
  const brandId = knownBrand(input.brandId);
  return mutate((db) => {
    const list = (db.products ??= allProducts());
    const current = list.find((p) => p.id === id);
    if (!current) return { ok: false as const, error: "not_found" as const };
    // ERP products: SKU, sizes, weight, stock and fixed prices stay as the ERP sent them
    const fromErp = current.source === "erp";
    const merged: ProductInput = fromErp ? { ...input, sku: current.sku, variants: current.variants } : input;
    const problem = checkUnique(list, merged, id);
    if (problem) return problem;
    const product: AdminProduct = {
      ...current,
      ...merged,
      brandId, // written even when empty, so "No collection" really removes it
      variants: fromErp ? current.variants : cleanVariants(id, merged.variants),
      updatedAt: new Date().toISOString(),
    };
    db.products = list.map((p) => (p.id === id ? product : p));
    return { ok: true as const, product };
  });
}

export function setProductVisible(id: string, visible: boolean): ProductSaveResult {
  return mutate((db) => {
    const list = (db.products ??= allProducts());
    const p = list.find((x) => x.id === id);
    if (!p) return { ok: false as const, error: "not_found" as const };
    p.visible = visible;
    p.updatedAt = new Date().toISOString();
    return { ok: true as const, product: p };
  });
}

/** Only products added in the dashboard can be deleted. ERP products are hidden instead. */
export function deleteProduct(id: string): ProductSaveResult {
  return mutate((db) => {
    const list = (db.products ??= allProducts());
    const p = list.find((x) => x.id === id);
    if (!p) return { ok: false as const, error: "not_found" as const };
    if (p.source === "erp") return { ok: false as const, error: "erp_product" as const };
    db.products = list.filter((x) => x.id !== id);
    return { ok: true as const, product: p };
  });
}

/** "Sync with ERP": weight, stock, SKU and fixed prices from mock-data/products.json (the pretend ERP) */
export function syncFromErp(): { updated: number; at: string } {
  return mutate((db) => {
    const list = (db.products ??= allProducts());
    const erp = new Map(erpProducts.map((p) => [p.id, p]));
    let updated = 0;
    for (const p of list) {
      const source = erp.get(p.id);
      if (p.source !== "erp" || !source) continue;
      const before = JSON.stringify(p.variants);
      p.sku = source.sku;
      p.variants = source.variants.map((v) => ({ ...v }));
      if (JSON.stringify(p.variants) !== before) {
        updated += 1;
        p.updatedAt = new Date().toISOString();
      }
    }
    // ERP products that are new in the file are added (visible)
    for (const source of erpProducts) {
      if (!list.some((p) => p.id === source.id)) {
        list.push({ ...source, visible: true, source: "erp", updatedAt: new Date().toISOString() });
        updated += 1;
      }
    }
    // The pretend ERP file doesn't know the website's sales: take the open orders off again
    reapplyOpenOrders(list, db.stockLedger);
    db.lastSyncAt = new Date().toISOString();
    return { updated, at: db.lastSyncAt };
  });
}

/* ---------- categories ---------- */
export function listCategories(): AdminCategory[] {
  const products = allProducts();
  return [...storedCategories()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ ...c, productCount: products.filter((p) => p.categoryId === c.id).length }));
}

/** true when `parentId` is `id` itself or one of its sub-categories (that would make a loop) */
function makesLoop(cats: StoredCategory[], id: string, parentId?: string) {
  let cur = parentId;
  for (let i = 0; cur && i < 50; i++) {
    if (cur === id) return true;
    cur = cats.find((c) => c.id === cur)?.parentId;
  }
  return false;
}

const withCount = (c: StoredCategory): AdminCategory => ({ ...c, productCount: allProducts().filter((p) => p.categoryId === c.id).length });

export function createCategory(input: CategoryInput): CategorySaveResult {
  const result = mutate((db) => {
    const cats = (db.categories ??= storedCategories());
    if (cats.some((c) => c.slug === input.slug)) return { ok: false as const, error: "slug_taken" as const };
    if (input.parentId && !cats.some((c) => c.id === input.parentId)) return { ok: false as const, error: "bad_parent" as const };
    const cat: StoredCategory = { ...input, id: newId("cat"), sortOrder: Math.max(-1, ...cats.map((c) => c.sortOrder)) + 1 };
    cats.push(cat);
    return { ok: true as const, cat };
  });
  return result.ok ? { ok: true, category: withCount(result.cat) } : result;
}

export function updateCategory(id: string, input: CategoryInput): CategorySaveResult {
  const result = mutate((db) => {
    const cats = (db.categories ??= storedCategories());
    const current = cats.find((c) => c.id === id);
    if (!current) return { ok: false as const, error: "not_found" as const };
    if (cats.some((c) => c.id !== id && c.slug === input.slug)) return { ok: false as const, error: "slug_taken" as const };
    if (input.parentId && (!cats.some((c) => c.id === input.parentId) || makesLoop(cats, id, input.parentId))) return { ok: false as const, error: "bad_parent" as const };
    const cat: StoredCategory = { ...current, ...input, parentId: input.parentId || undefined };
    db.categories = cats.map((c) => (c.id === id ? cat : c));
    return { ok: true as const, cat };
  });
  return result.ok ? { ok: true, category: withCount(result.cat) } : result;
}

/** New order of the categories on the website (ids from first to last) */
export function reorderCategories(ids: string[]): AdminCategory[] {
  mutate((db) => {
    const cats = (db.categories ??= storedCategories());
    const pos = new Map(ids.map((id, i) => [id, i]));
    for (const c of cats) c.sortOrder = pos.get(c.id) ?? ids.length + c.sortOrder;
  });
  return listCategories();
}

/** Only empty categories can be deleted (move or re-categorise the products first) */
export function deleteCategory(id: string): CategorySaveResult {
  const cat = storedCategories().find((c) => c.id === id);
  if (!cat) return { ok: false, error: "not_found" };
  if (allProducts().some((p) => p.categoryId === id)) return { ok: false, error: "has_products" };
  if (storedCategories().some((c) => c.parentId === id)) return { ok: false, error: "has_children" };
  mutate((db) => {
    db.categories = (db.categories ?? []).filter((c) => c.id !== id);
  });
  return { ok: true, category: { ...cat, productCount: 0 } };
}

/* ---------- collections (called "brands" in the code) ---------- */
type StoredBrand = Brand & { visible: boolean };

function storedBrands(): StoredBrand[] {
  const existing = read((db) => db.brands);
  if (existing) return existing;
  return mutate((db) => (db.brands ??= (brandsJson as Brand[]).map((b, i) => ({ ...b, sortOrder: i, visible: true }))));
}

const brandCount = (b: StoredBrand, products = allProducts()): AdminBrand => ({ ...b, productCount: products.filter((p) => p.brandId === b.id).length });

export function listBrands(): AdminBrand[] {
  const products = allProducts();
  return [...storedBrands()].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((b) => brandCount(b, products));
}

export function createBrand(input: BrandInput): BrandSaveResult {
  const result = mutate((db) => {
    const list = (db.brands ??= storedBrands());
    if (list.some((b) => b.slug === input.slug)) return { ok: false as const, error: "slug_taken" as const };
    const brand: StoredBrand = { ...input, id: newId("brand"), sortOrder: Math.max(-1, ...list.map((b) => b.sortOrder ?? 0)) + 1 };
    list.push(brand);
    return { ok: true as const, brand };
  });
  return result.ok ? { ok: true, brand: brandCount(result.brand) } : result;
}

export function updateBrand(id: string, input: BrandInput): BrandSaveResult {
  const result = mutate((db) => {
    const list = (db.brands ??= storedBrands());
    const current = list.find((b) => b.id === id);
    if (!current) return { ok: false as const, error: "not_found" as const };
    if (list.some((b) => b.id !== id && b.slug === input.slug)) return { ok: false as const, error: "slug_taken" as const };
    const brand: StoredBrand = { ...current, ...input, logo: input.logo };
    db.brands = list.map((b) => (b.id === id ? brand : b));
    return { ok: true as const, brand };
  });
  return result.ok ? { ok: true, brand: brandCount(result.brand) } : result;
}

/** New order of the collections on the website (ids from first to last) */
export function reorderBrands(ids: string[]): AdminBrand[] {
  storedBrands();
  mutate((db) => {
    const pos = new Map(ids.map((id, i) => [id, i]));
    for (const b of db.brands ?? []) b.sortOrder = pos.get(b.id) ?? ids.length + (b.sortOrder ?? 0);
  });
  return listBrands();
}

/** Deleting a collection keeps its products: they just stop belonging to it */
export function deleteBrand(id: string): BrandSaveResult {
  const brand = storedBrands().find((b) => b.id === id);
  if (!brand) return { ok: false, error: "not_found" };
  allProducts();
  mutate((db) => {
    db.brands = (db.brands ?? []).filter((b) => b.id !== id);
    for (const p of db.products ?? []) if (p.brandId === id) p.brandId = undefined;
  });
  return { ok: true, brand: { ...brand, productCount: 0 } };
}

/* ---------- what the storefront may see ---------- */
export function publicCatalog(): PublicCatalog {
  const cats = storedCategories();
  const hidden = new Set(cats.filter((c) => !c.visible).map((c) => c.id));
  // A category is hidden when it, or any category above it, is hidden
  const isHidden = (id?: string): boolean => {
    for (let cur = id, i = 0; cur && i < 50; i++) {
      if (hidden.has(cur)) return true;
      cur = cats.find((c) => c.id === cur)?.parentId;
    }
    return false;
  };
  return {
    categories: cats.filter((c) => !isHidden(c.id)).map(({ visible: _v, ...c }) => c),
    products: allProducts()
      .filter((p) => p.visible && !isHidden(p.categoryId))
      .map(({ visible: _v, source: _s, updatedAt: _u, ...p }) => p),
    brands: listBrands()
      .filter((b) => b.visible)
      .map(({ visible: _v, productCount: _n, ...b }) => b),
  };
}
