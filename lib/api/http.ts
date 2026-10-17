/**
 * REAL API — used when DATA_SOURCE=http. Talks to ADMIN_API_BASE_URL.
 * ------------------------------------------------------------------
 * Every request:
 *   - runs on the server only (the API address and tokens never reach the browser)
 *   - sends "Authorization: Bearer <staff token>" when logged in
 *   - is never cached (dashboard data must always be fresh)
 *
 * The addresses below (/admin/auth/login, /admin/overview) are the agreed API routes —
 * the full list is in the "Dashboard Build Plan" document. Change them here if the API team uses others.
 */
import "server-only";
import type { CustomListResult, CustomRequest, CustomUpdateResult, NotificationList, BranchSaveResult, StaffAccess, StaffMember, StaffSaveResult, StoreSettings, AdminBrand, BrandInput, BrandSaveResult, AdminHome, HomePage, HomeSaveResult, CheckoutSaveResult, CheckoutSettings, AdminCoupon, CouponSaveResult, PricingState, PublicPricing, AdminPage, ContentPage, MenuPage, PageSaveResult, PageSummary, AdminCategory, AdminProduct, CategorySaveResult, GoldPrice, ProductListResult, ProductSaveResult, PublicCatalog, AdminCustomer, AdminOrder, Branch, CustomerListResult, CustomerUpdateResult, InboxMessage, LoginResult, MessageListResult, MessageUpdateResult, MediaItem, OrderListResult, OrderUpdateResult, OverviewData, SalesReport, SiteTheme, ThemeState } from "@/types";
import type { AdminApi } from "./types";

const BASE = process.env.ADMIN_API_BASE_URL?.replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  if (!BASE) throw new Error("ADMIN_API_BASE_URL is not set (.env.local)");
  const { token, headers, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    // Error answers may explain why, e.g. { "error": "slug_taken" }
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, `${init.method ?? "GET"} ${path} failed: ${res.status}`, body?.error);
  }
  // Some answers have no body (e.g. 204 after a delete)
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Error code sent by the API, e.g. "slug_taken" */
    public code?: string,
  ) {
    super(message);
  }
}

async function orderChange(path: string, body: unknown, token?: string): Promise<OrderUpdateResult> {
  try {
    return await request<OrderUpdateResult>(path, { method: "POST", body: JSON.stringify(body), token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: false, error: "not_found" };
    if (e instanceof ApiError && (e.status === 409 || e.status === 422)) return { ok: false, error: "invalid_transition" };
    throw e;
  }
}

async function customerChange(path: string, body: unknown, token?: string): Promise<CustomerUpdateResult> {
  try {
    return await request<CustomerUpdateResult>(path, { method: "POST", body: JSON.stringify(body), token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: false, error: "not_found" };
    if (e instanceof ApiError && e.status === 422) return { ok: false, error: "reason_required" };
    if (e instanceof ApiError && e.status === 409) return { ok: false, error: "guest" };
    throw e;
  }
}

async function customChange(path: string, body: unknown, token?: string): Promise<CustomUpdateResult> {
  try {
    return await request<CustomUpdateResult>(path, { method: "POST", body: JSON.stringify(body), token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: false, error: "not_found" };
    throw e;
  }
}

async function messageChange(path: string, body: unknown, token?: string): Promise<MessageUpdateResult> {
  try {
    return await request<MessageUpdateResult>(path, { method: "POST", body: JSON.stringify(body), token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: false, error: "not_found" };
    if (e instanceof ApiError && e.status === 422) return { ok: false, error: "no_email" };
    throw e;
  }
}

/** Save calls answer { ok, … } or { ok: false, error } — 404 / 409 / 422 errors are turned into that shape */
async function save<T extends { ok: boolean }>(path: string, init: RequestInit & { token?: string }): Promise<T> {
  try {
    return await request<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { ok: false, error: "not_found" } as unknown as T;
    if (e instanceof ApiError && (e.status === 409 || e.status === 422)) return { ok: false, error: e.code ?? "validation" } as unknown as T;
    throw e;
  }
}

export const httpApi: AdminApi = {
  async login(email, password) {
    try {
      return await request<LoginResult>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return { ok: false, error: "invalid_credentials" };
      if (e instanceof ApiError && e.status === 429) return { ok: false, error: "too_many_attempts" };
      throw e;
    }
  },

  async requestPasswordReset(email) {
    await request<unknown>("/admin/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },

  /* ===== SETTINGS: STAFF ===== */
  listStaff(token) {
    return request<StaffMember[]>("/admin/staff", { token });
  },
  async getStaff(id, token) {
    try {
      return await request<StaffMember>(`/admin/staff/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  createStaff(input, password, _by, token) {
    return save<StaffSaveResult>("/admin/staff", { method: "POST", body: JSON.stringify({ ...input, password }), token });
  },
  updateStaff(id, input, token) {
    return save<StaffSaveResult>(`/admin/staff/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  deleteStaff(id, token) {
    return save<StaffSaveResult>(`/admin/staff/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  setStaffTempPassword(id, password, token) {
    return save<StaffSaveResult>(`/admin/staff/${encodeURIComponent(id)}/password`, { method: "PUT", body: JSON.stringify({ password }), token });
  },
  changeOwnPassword(_staffId, current, next, token) {
    return save<StaffSaveResult>("/admin/me/password", { method: "PUT", body: JSON.stringify({ current, next }), token });
  },
  async getStaffAccess(_staffId, token) {
    try {
      return await request<StaffAccess>("/admin/me", { token });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) return null;
      throw e;
    }
  },

  /* ===== NOTIFICATIONS ===== */
  listNotifications(_staffId, _permissions, query, token) {
    return request<NotificationList>(`/admin/notifications?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`, { token });
  },
  async markNotificationsRead(_staffId, ids, token) {
    await request<unknown>("/admin/notifications/read", { method: "POST", body: JSON.stringify(ids === "all" ? { all: true } : { ids }), token });
  },
  async setNotificationsOff(_staffId, off, token) {
    await request<unknown>("/admin/notifications/preferences", { method: "PUT", body: JSON.stringify({ off }), token });
  },

  /* ===== SETTINGS: STORE DETAILS & BRANCHES ===== */
  getStoreSettings(token) {
    return request<StoreSettings>("/admin/store-settings", { token });
  },
  saveStoreSettings(settings, token) {
    return request<StoreSettings>("/admin/store-settings", { method: "PUT", body: JSON.stringify(settings), token });
  },
  createBranch(input, token) {
    return save<BranchSaveResult>("/admin/branches", { method: "POST", body: JSON.stringify(input), token });
  },
  updateBranch(id, input, token) {
    return save<BranchSaveResult>(`/admin/branches/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  deleteBranch(id, token) {
    return save<BranchSaveResult>(`/admin/branches/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  reorderBranches(ids, token) {
    return request<Branch[]>("/admin/branches/order", { method: "PUT", body: JSON.stringify({ ids }), token });
  },
  // With the real API the storefront reads these itself
  getPublicStore() {
    return request<StoreSettings>("/storefront/settings");
  },

  getOverview(token) {
    return request<OverviewData>("/admin/overview", { token });
  },

  /* ===== ORDERS ===== */
  listOrders(query, token) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<OrderListResult>(`/admin/orders?${qs}`, { token });
  },
  getBranches(token) {
    return request<Branch[]>("/admin/branches", { token });
  },
  async getOrder(id, token) {
    try {
      return await request<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  // The API answers { ok, order } or { ok: false, error } (409 = not allowed from the current status)
  updateOrderStatus(id, change, _by, token) {
    return orderChange(`/admin/orders/${encodeURIComponent(id)}/status`, change, token);
  },
  updatePaymentStatus(id, paymentStatus, _by, token) {
    return orderChange(`/admin/orders/${encodeURIComponent(id)}/payment`, { paymentStatus }, token);
  },
  addOrderNote(id, note, _by, token) {
    return orderChange(`/admin/orders/${encodeURIComponent(id)}/notes`, { note }, token);
  },

  /* ===== CUSTOMERS ===== */
  listCustomers(query, token) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<CustomerListResult>(`/admin/customers?${qs}`, { token });
  },
  async getCustomer(id, token) {
    try {
      return await request<AdminCustomer>(`/admin/customers/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  // The API answers { ok, customer } or { ok: false, error }. It also signs the customer out of the website when stopped.
  setCustomerDisabled(id, disabled, reason, _by, token) {
    return customerChange(`/admin/customers/${encodeURIComponent(id)}/status`, { disabled, reason }, token);
  },
  addCustomerNote(id, note, _by, token) {
    return customerChange(`/admin/customers/${encodeURIComponent(id)}/notes`, { note }, token);
  },

  /* ===== CONTACT MESSAGES ===== */
  listMessages(query, token) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<MessageListResult>(`/admin/contact-messages?${qs}`, { token });
  },
  async getMessage(id, token) {
    try {
      return await request<InboxMessage>(`/admin/contact-messages/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  markMessageRead(id, token) {
    return messageChange(`/admin/contact-messages/${encodeURIComponent(id)}/read`, {}, token);
  },
  setMessageStatus(id, status, _by, token) {
    return messageChange(`/admin/contact-messages/${encodeURIComponent(id)}/status`, { status }, token);
  },
  // The API emails the reply when channel = "email" (in the visitor's language)
  replyToMessage(id, reply, _by, token) {
    return messageChange(`/admin/contact-messages/${encodeURIComponent(id)}/replies`, reply, token);
  },
  addMessageNote(id, note, _by, token) {
    return messageChange(`/admin/contact-messages/${encodeURIComponent(id)}/notes`, { note }, token);
  },

  /* ===== CUSTOMIZATION REQUESTS ===== */
  // Photo "url"s must be addresses staff can open (e.g. short-lived signed links) — the photos are private.
  listCustomRequests(query, token) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<CustomListResult>(`/admin/custom-requests?${qs}`, { token });
  },
  async getCustomRequest(id, token) {
    try {
      return await request<CustomRequest>(`/admin/custom-requests/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  markCustomRead(id, token) {
    return customChange(`/admin/custom-requests/${encodeURIComponent(id)}/read`, {}, token);
  },
  setCustomStatus(id, change, _by, token) {
    return customChange(`/admin/custom-requests/${encodeURIComponent(id)}/status`, change, token);
  },
  addCustomNote(id, note, _by, token) {
    return customChange(`/admin/custom-requests/${encodeURIComponent(id)}/notes`, { note }, token);
  },

  /* ===== PRODUCTS ===== */
  listProducts(query, token) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return request<ProductListResult>(`/admin/products?${qs}`, { token });
  },
  async getProduct(id, token) {
    try {
      return await request<AdminProduct>(`/admin/products/${encodeURIComponent(id)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  createProduct(input, token) {
    return save<ProductSaveResult>("/admin/products", { method: "POST", body: JSON.stringify(input), token });
  },
  updateProduct(id, input, token) {
    return save<ProductSaveResult>(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  setProductVisibility(id, visible, token) {
    return save<ProductSaveResult>(`/admin/products/${encodeURIComponent(id)}/visibility`, { method: "POST", body: JSON.stringify({ visible }), token });
  },
  deleteProduct(id, token) {
    return save<ProductSaveResult>(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  syncProducts(token) {
    return request<{ updated: number; at: string }>("/admin/products/sync", { method: "POST", token });
  },
  getGoldPrices(token) {
    return request<GoldPrice[]>("/admin/gold-prices", { token });
  },

  /* ===== CATEGORIES ===== */
  listCategories(token) {
    return request<AdminCategory[]>("/admin/categories", { token });
  },
  createCategory(input, token) {
    return save<CategorySaveResult>("/admin/categories", { method: "POST", body: JSON.stringify(input), token });
  },
  updateCategory(id, input, token) {
    return save<CategorySaveResult>(`/admin/categories/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  reorderCategories(ids, token) {
    return request<AdminCategory[]>("/admin/categories/order", { method: "PUT", body: JSON.stringify({ ids }), token });
  },
  deleteCategory(id, token) {
    return save<CategorySaveResult>(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  // With the real API the storefront reads the catalog from the API itself — this is only for development
  getPublicCatalog() {
    return request<PublicCatalog>("/storefront/catalog");
  },

  /* ===== GOLD PRICES & COUPONS ===== */
  getPricing(token) {
    return request<PricingState>("/admin/pricing", { token });
  },
  savePricingSettings(settings, token) {
    return request<PricingState>("/admin/pricing/settings", { method: "PUT", body: JSON.stringify(settings), token });
  },
  saveGoldPrices(prices, _by, token) {
    return save<{ ok: true; changed: number; state: PricingState } | { ok: false; error: "erp_source" }>("/admin/gold-prices", { method: "PUT", body: JSON.stringify({ prices }), token });
  },
  syncGoldPrices(token) {
    return request<{ changed: number; state: PricingState }>("/admin/gold-prices/sync", { method: "POST", token });
  },
  listCoupons(token) {
    return request<AdminCoupon[]>("/admin/coupons", { token });
  },
  createCoupon(input, token) {
    return save<CouponSaveResult>("/admin/coupons", { method: "POST", body: JSON.stringify(input), token });
  },
  updateCoupon(code, input, token) {
    return save<CouponSaveResult>(`/admin/coupons/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  deleteCoupon(code, token) {
    return save<CouponSaveResult>(`/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE", token });
  },
  // With the real API the storefront gets prices / coupons from the API itself — development only
  getPublicPricing() {
    return request<PublicPricing>("/storefront/pricing");
  },

  /* ===== SHIPPING & PAYMENT ===== */
  getCheckoutSettings(token) {
    return request<CheckoutSettings>("/admin/checkout-options", { token });
  },
  saveCheckoutSettings(settings, token) {
    return save<CheckoutSaveResult>("/admin/checkout-options", { method: "PUT", body: JSON.stringify(settings), token });
  },

  /* ===== SITE PAGES ===== */
  listPages(token) {
    return request<PageSummary[]>("/admin/pages", { token });
  },
  async getPage(slug, token) {
    try {
      return await request<AdminPage>(`/admin/pages/${encodeURIComponent(slug)}`, { token });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  createPage(input, _by, token) {
    return save<PageSaveResult>("/admin/pages", { method: "POST", body: JSON.stringify(input), token });
  },
  savePageDraft(slug, content, _by, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}/draft`, { method: "PUT", body: JSON.stringify(content), token });
  },
  publishPage(slug, _by, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}/publish`, { method: "POST", token });
  },
  discardPageDraft(slug, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}/draft`, { method: "DELETE", token });
  },
  unpublishPage(slug, _by, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}/unpublish`, { method: "POST", token });
  },
  updatePageSettings(slug, settings, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}`, { method: "PATCH", body: JSON.stringify(settings), token });
  },
  deletePage(slug, token) {
    return save<PageSaveResult>(`/admin/pages/${encodeURIComponent(slug)}`, { method: "DELETE", token });
  },
  // With the real API the storefront reads pages from the API itself (it checks the preview token there)
  async getPublicPage(slug) {
    try {
      return await request<ContentPage>(`/storefront/pages/${encodeURIComponent(slug)}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  getPublicMenu() {
    return request<MenuPage[]>("/storefront/pages?menu=1");
  },

  /* ===== HOMEPAGE ===== */
  getHome(token) {
    return request<AdminHome>("/admin/home", { token });
  },
  saveHomeDraft(content, _by, token) {
    return save<HomeSaveResult>("/admin/home/draft", { method: "PUT", body: JSON.stringify(content), token });
  },
  publishHome(_by, token) {
    return save<HomeSaveResult>("/admin/home/publish", { method: "POST", token });
  },
  discardHomeDraft(token) {
    return save<HomeSaveResult>("/admin/home/draft", { method: "DELETE", token });
  },
  listBrands(token) {
    return request<AdminBrand[]>("/admin/brands", { token });
  },
  createBrand(input: BrandInput, token) {
    return save<BrandSaveResult>("/admin/brands", { method: "POST", body: JSON.stringify(input), token });
  },
  updateBrand(id, input: BrandInput, token) {
    return save<BrandSaveResult>(`/admin/brands/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input), token });
  },
  reorderBrands(ids, token) {
    return request<AdminBrand[]>("/admin/brands/order", { method: "PUT", body: JSON.stringify({ ids }), token });
  },
  deleteBrand(id, token) {
    return save<BrandSaveResult>(`/admin/brands/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
  // With the real API the storefront reads the homepage from the API itself (it checks the preview token there)
  getPublicHome() {
    return request<HomePage>("/storefront/home");
  },

  /* ===== REPORTS ===== */
  getSalesReport(query, token) {
    const qs = new URLSearchParams({ period: query.period });
    if (query.from) qs.set("from", query.from);
    if (query.to) qs.set("to", query.to);
    return request<SalesReport>(`/admin/reports/sales?${qs}`, { token });
  },

  /* ===== THEME ===== */
  getThemeState(token) {
    return request<ThemeState>("/admin/theme", { token });
  },
  saveThemeDraft(theme, _by, token) {
    return request<ThemeState>("/admin/theme/draft", { method: "PUT", body: JSON.stringify(theme), token });
  },
  publishTheme(_by, token) {
    return request<ThemeState>("/admin/theme/publish", { method: "POST", token });
  },
  discardThemeDraft(token) {
    return request<ThemeState>("/admin/theme/draft", { method: "DELETE", token });
  },
  getPublishedTheme() {
    return request<SiteTheme>("/storefront/theme");
  },

  /* ===== MEDIA ===== */
  listMedia(token) {
    return request<MediaItem[]>("/admin/media", { token });
  },
  async uploadMedia(file, _by, token) {
    if (!BASE) throw new Error("ADMIN_API_BASE_URL is not set (.env.local)");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), file.fileName);
    const res = await fetch(`${BASE}/admin/media`, {
      method: "POST",
      body: form,
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new ApiError(res.status, `POST /admin/media failed: ${res.status}`);
    return (await res.json()) as MediaItem;
  },
  async updateMediaAlt(id, alt, token) {
    return request<MediaItem>(`/admin/media/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ alt }), token });
  },
  async deleteMedia(id, token) {
    await request<unknown>(`/admin/media/${encodeURIComponent(id)}`, { method: "DELETE", token });
    return true;
  },
};
