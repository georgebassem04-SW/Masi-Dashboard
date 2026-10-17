/**
 * PAGE ADDRESSES — the same rule as the storefront (storefront: lib/site-pages.ts → pagePath):
 *   about, contact, faq, terms  -> /about, /contact, /faq, /terms   (they have their own address)
 *   any other page               -> /pages/<slug>
 */
export const SYSTEM_PAGES = ["about", "contact", "faq", "terms"];

/**
 * SHOP PAGE TOPS — two special entries in Site pages that are not pages by themselves: their blocks
 * (a hero, a banner, text…) are drawn at the TOP of a shop page on the website. They can be left empty.
 *   "shop-products"   -> top of /products (All products)
 *   "shop-categories" -> top of /categories
 * Same list in the storefront: lib/site-pages.ts → SHOP_PAGES. Their names: SHOP_PAGE_TITLES below.
 */
export const SHOP_PAGES: Record<string, string> = { "shop-products": "/products", "shop-categories": "/categories" };
export const SHOP_PAGE_TITLES: Record<string, { ar: string; en: string }> = {
  "shop-products": { ar: "أعلى صفحة: كل المنتجات", en: "Top of: All products" },
  "shop-categories": { ar: "أعلى صفحة: الأقسام", en: "Top of: Categories" },
};
export const isShopPage = (slug: string) => slug in SHOP_PAGES;

export const pagePath = (slug: string) => SHOP_PAGES[slug] ?? (SYSTEM_PAGES.includes(slug) ? `/${slug}` : `/pages/${slug}`);

/** Addresses the storefront already uses for something else — a page can't take them */
export const RESERVED_SLUGS = ["account", "cart", "categories", "checkout", "login", "order-success", "products", "register", "search", "pages", "api", "shop-products", "shop-categories"];
