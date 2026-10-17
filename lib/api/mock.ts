/**
 * MOCK API — pretends to be the real API using the JSON files in mock-data/.
 * To change the sample data, edit mock-data/*.json (not this file).
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AdminOrder, MediaItem, OrderUpdateResult, OverviewData } from "@/types";
import { allOrders, findOrder, listOrders, saveOrder, toSummary } from "./mock-orders";
import { addNote, changePayment, changeStatus } from "@/lib/orders/changes";
import { addCustomerNote, findCustomer, listCustomers, setCustomerDisabled } from "./mock-customers";
import { buildSalesReport } from "@/lib/reports/build";
import { getCheckoutSettings, saveCheckoutSettings } from "./mock-checkout";
import {
  createCoupon,
  currentGoldPrices,
  deleteCoupon,
  getPricing,
  listCoupons,
  publicPricing,
  saveGoldPrices,
  savePricingSettings,
  syncGoldPrices,
  updateCoupon,
} from "./mock-pricing";
import {
  createPage,
  deletePage,
  discardDraft,
  findPage,
  listPages,
  publicMenu,
  publicPage,
  publishPage,
  saveDraft,
  unpublishPage,
  updatePageSettings,
} from "./mock-pages";
import { discardHomeDraft, getHome, publicHome, publishHome, saveHomeDraft } from "./mock-home";
import {
  allProducts,
  createBrand,
  createCategory,
  deleteBrand,
  listBrands,
  reorderBrands,
  updateBrand,
  createProduct,
  deleteCategory,
  deleteProduct,
  findProduct,
  listCategories,
  listProducts,
  publicCatalog,
  reorderCategories,
  setProductVisible,
  syncFromErp,
  updateCategory,
  updateProduct,
} from "./mock-catalog";
import { addMessageNote, findMessage, listMessages, markMessageRead, replyToMessage, setMessageStatus } from "./mock-inbox";
import { addCustomNote, findCustomRequest, listCustomRequests, markCustomRead, setCustomStatus } from "./mock-custom";
import { mutate, read, UPLOADS_DIR } from "./mock-db";
import type { AdminApi } from "./types";
import { storeConfig } from "@/config/store";

import { changeOwnPassword, createStaff, deleteStaff, findStaff, listStaff, loginStaff, setTempPassword, staffAccess, updateStaff } from "./mock-staff";
import { listNotifications, markRead, setOffTypes } from "./mock-notifications";
import { createBranch, deleteBranch, getStore, listBranches, reorderBranches, saveStore, updateBranch } from "./mock-branches";

/** Address the storefront uses to load uploaded images (this dashboard's own address in development) */
const MEDIA_BASE_URL = (process.env.MEDIA_PUBLIC_URL ?? "http://localhost:3002").replace(/\/$/, "");

/** Small delay so loading states can be seen during development */
const delay = <T>(value: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(value), ms));

const isSameDay = (iso: string, daysBack: number) => {
  const d = new Date(iso);
  const ref = new Date(Date.now() - daysBack * 86400_000);
  return d.toDateString() === ref.toDateString();
};

/** Load an order, apply a change, save it. Also logs the customer email the real API would send. */
function apply(id: string, change: (o: AdminOrder) => OrderUpdateResult): OrderUpdateResult {
  const order = findOrder(id);
  if (!order) return { ok: false, error: "not_found" };
  const result = change(order);
  if (result.ok) {
    saveOrder(result.order);
    if (result.order.status !== order.status && result.order.customer.email) {
      console.info(`[mock] would email ${result.order.customer.email}: order ${order.number} is now "${result.order.status}"`);
    }
  }
  return result;
}

export const mockApi: AdminApi = {
  async login(email, password) {
    const result = loginStaff(email, password);
    return delay(result.ok ? { ...result, token: `mock-token-${result.staff.id}` } : result);
  },

  /* ===== SETTINGS: STAFF ===== */
  async listStaff() {
    return delay(listStaff());
  },
  async getStaff(id) {
    return delay(findStaff(id));
  },
  async createStaff(input, password, by) {
    return delay(createStaff(input, password, by));
  },
  async updateStaff(id, input) {
    return delay(updateStaff(id, input));
  },
  async deleteStaff(id) {
    return delay(deleteStaff(id));
  },
  async setStaffTempPassword(id, password) {
    return delay(setTempPassword(id, password));
  },
  async changeOwnPassword(staffId, current, next) {
    return delay(changeOwnPassword(staffId, current, next));
  },
  async getStaffAccess(staffId) {
    return staffAccess(staffId);
  },

  /* ===== NOTIFICATIONS ===== */
  async listNotifications(staffId, permissions, query) {
    return listNotifications(staffId, permissions, query);
  },
  async markNotificationsRead(staffId, ids) {
    markRead(staffId, ids);
  },
  async setNotificationsOff(staffId, off) {
    setOffTypes(staffId, off);
  },

  /* ===== SETTINGS: STORE DETAILS & BRANCHES ===== */
  async getStoreSettings() {
    return delay(getStore());
  },
  async saveStoreSettings(settings) {
    return delay(saveStore(settings));
  },
  async createBranch(input) {
    return delay(createBranch(input));
  },
  async updateBranch(id, input) {
    return delay(updateBranch(id, input));
  },
  async deleteBranch(id) {
    return delay(deleteBranch(id));
  },
  async reorderBranches(ids) {
    return delay(reorderBranches(ids));
  },
  async getPublicStore() {
    return getStore();
  },

  async requestPasswordReset(email) {
    // Mock: just log it. The real API sends the email.
    console.info(`[mock] password reset requested for ${email}`);
    await delay(null);
  },

  async getOverview() {
    const orders = allOrders();
    const active = orders.filter((o) => o.status !== "cancelled");
    const today = active.filter((o) => isSameDay(o.createdAt, 0)).reduce((s, o) => s + o.total, 0);
    const yesterday = active.filter((o) => isSameDay(o.createdAt, 1)).reduce((s, o) => s + o.total, 0);
    const lowStock = allProducts().filter((p) => {
      const qty = p.variants.reduce((s, v) => s + v.stockQty, 0);
      return p.visible && qty > 0 && qty <= 2;
    }).length;

    const data: OverviewData = {
      salesToday: today,
      salesChangePct: yesterday ? Math.round(((today - yesterday) / yesterday) * 100) : 0,
      newOrders: orders.filter((o) => Date.now() - Date.parse(o.createdAt) < 86400_000).length,
      awaitingConfirmation: orders.filter((o) => o.status === "pending").length,
      unreadMessages: listMessages({ pageSize: 1 }).counts.new,
      lowStockProducts: lowStock,
      currency: storeConfig.currency,
      goldPrices: currentGoldPrices(),
      recentOrders: orders.slice(0, 6).map(toSummary),
    };
    return delay(data);
  },

  /* ===== ORDERS ===== */
  async listOrders(query) {
    return delay(listOrders(query));
  },

  async getBranches() {
    return listBranches();
  },

  async getOrder(id) {
    return delay(findOrder(id));
  },

  async updateOrderStatus(id, change, by) {
    return delay(apply(id, (o) => changeStatus(o, change.status, { ...change, by })));
  },

  async updatePaymentStatus(id, paymentStatus, by) {
    return delay(apply(id, (o) => changePayment(o, paymentStatus, by)));
  },

  async addOrderNote(id, note, by) {
    return delay(apply(id, (o) => addNote(o, note, by)));
  },

  /* ===== CUSTOMERS ===== */
  async listCustomers(query) {
    return delay(listCustomers(query));
  },

  async getCustomer(id) {
    return delay(findCustomer(id));
  },

  async setCustomerDisabled(id, disabled, reason, by) {
    const result = setCustomerDisabled(id, disabled, reason, by);
    if (result.ok && result.customer.email) console.info(`[mock] account ${result.customer.email} is now ${disabled ? "stopped" : "active"}`);
    return delay(result);
  },

  async addCustomerNote(id, note, by) {
    return delay(addCustomerNote(id, note, by));
  },

  /* ===== CONTACT MESSAGES ===== */
  async listMessages(query) {
    return delay(listMessages(query));
  },

  async getMessage(id) {
    return delay(findMessage(id));
  },

  async markMessageRead(id) {
    return delay(markMessageRead(id), 50);
  },

  async setMessageStatus(id, status, by) {
    return delay(setMessageStatus(id, status, by));
  },

  async replyToMessage(id, reply, by) {
    return delay(replyToMessage(id, reply, by));
  },

  async addMessageNote(id, note, by) {
    return delay(addMessageNote(id, note, by));
  },

  /* ===== CUSTOMIZATION REQUESTS ===== */
  async listCustomRequests(query) {
    return delay(listCustomRequests(query));
  },
  async getCustomRequest(id) {
    return delay(findCustomRequest(id));
  },
  async markCustomRead(id) {
    return delay(markCustomRead(id), 50);
  },
  async setCustomStatus(id, change, by) {
    return delay(setCustomStatus(id, change, by));
  },
  async addCustomNote(id, note, by) {
    return delay(addCustomNote(id, note, by));
  },

  /* ===== PRODUCTS ===== */
  async listProducts(query) {
    return delay(listProducts(query, currentGoldPrices()));
  },
  async getProduct(id) {
    return delay(findProduct(id));
  },
  async createProduct(input) {
    return delay(createProduct(input));
  },
  async updateProduct(id, input) {
    return delay(updateProduct(id, input));
  },
  async setProductVisibility(id, visible) {
    return delay(setProductVisible(id, visible), 50);
  },
  async deleteProduct(id) {
    return delay(deleteProduct(id));
  },
  async syncProducts() {
    return delay(syncFromErp(), 600);
  },
  async getGoldPrices() {
    return currentGoldPrices();
  },

  /* ===== CATEGORIES ===== */
  async listCategories() {
    return delay(listCategories());
  },
  async createCategory(input) {
    return delay(createCategory(input));
  },
  async updateCategory(id, input) {
    return delay(updateCategory(id, input));
  },
  async reorderCategories(ids) {
    return delay(reorderCategories(ids), 50);
  },
  async deleteCategory(id) {
    return delay(deleteCategory(id));
  },
  async getPublicCatalog() {
    return publicCatalog();
  },

  /* ===== GOLD PRICES & COUPONS ===== */
  async getPricing() {
    return delay(getPricing());
  },
  async savePricingSettings(settings) {
    return delay(savePricingSettings(settings));
  },
  async saveGoldPrices(prices, by) {
    return delay(saveGoldPrices(prices, by));
  },
  async syncGoldPrices() {
    return delay(syncGoldPrices(), 500);
  },
  async listCoupons() {
    return delay(listCoupons());
  },
  async createCoupon(input) {
    return delay(createCoupon(input));
  },
  async updateCoupon(code, input) {
    return delay(updateCoupon(code, input));
  },
  async deleteCoupon(code) {
    return delay(deleteCoupon(code));
  },
  async getPublicPricing() {
    return publicPricing();
  },

  /* ===== SHIPPING & PAYMENT ===== */
  async getCheckoutSettings() {
    return delay(getCheckoutSettings());
  },
  async saveCheckoutSettings(settings) {
    return delay(saveCheckoutSettings(settings));
  },

  /* ===== SITE PAGES ===== */
  async listPages() {
    return delay(listPages());
  },
  async getPage(slug) {
    return delay(findPage(slug));
  },
  async createPage(input, by) {
    return delay(createPage(input, by));
  },
  async savePageDraft(slug, content, by) {
    return delay(saveDraft(slug, content, by), 50);
  },
  async publishPage(slug, by) {
    return delay(publishPage(slug, by));
  },
  async discardPageDraft(slug) {
    return delay(discardDraft(slug));
  },
  async unpublishPage(slug, by) {
    return delay(unpublishPage(slug, by));
  },
  async updatePageSettings(slug, settings) {
    return delay(updatePageSettings(slug, settings));
  },
  async deletePage(slug) {
    return delay(deletePage(slug));
  },
  async getPublicPage(slug, preview) {
    return publicPage(slug, preview);
  },
  async getPublicMenu() {
    return publicMenu();
  },

  /* ===== HOMEPAGE ===== */
  async getHome() {
    return delay(getHome());
  },
  async saveHomeDraft(content, by) {
    return saveHomeDraft(content, by);
  },
  async publishHome(by) {
    return delay(publishHome(by));
  },
  async discardHomeDraft() {
    return delay(discardHomeDraft());
  },
  async listBrands() {
    return delay(listBrands());
  },
  async createBrand(input) {
    return delay(createBrand(input));
  },
  async updateBrand(id, input) {
    return delay(updateBrand(id, input));
  },
  async reorderBrands(ids) {
    return delay(reorderBrands(ids), 50);
  },
  async deleteBrand(id) {
    return delay(deleteBrand(id));
  },
  async getPublicHome(preview) {
    return publicHome(preview);
  },

  /* ===== REPORTS ===== */
  async getSalesReport(query) {
    const categories = new Map(listCategories().map((c) => [c.id, c]));
    const productCategory = new Map(allProducts().map((p) => [p.id, p.categoryId]));
    return delay(
      buildSalesReport(allOrders(), query, {
        currency: storeConfig.currency,
        categoryOf: (productId) => {
          const c = categories.get(productCategory.get(productId) ?? "");
          return c ? { id: c.id, name: c.name } : undefined;
        },
      }),
    );
  },

  /* ===== THEME ===== */
  async getThemeState() {
    return delay(read((db) => db.theme));
  },

  async saveThemeDraft(theme) {
    return delay(
      mutate((db) => {
        db.theme.draft = theme;
        db.theme.draftSavedAt = new Date().toISOString();
        return db.theme;
      }),
    );
  },

  async publishTheme(by) {
    return delay(
      mutate((db) => {
        if (db.theme.draft) db.theme.published = db.theme.draft;
        db.theme.draft = null;
        db.theme.draftSavedAt = null;
        db.theme.publishedAt = new Date().toISOString();
        db.theme.publishedBy = by;
        return db.theme;
      }),
    );
  },

  async discardThemeDraft() {
    return delay(
      mutate((db) => {
        db.theme.draft = null;
        db.theme.draftSavedAt = null;
        return db.theme;
      }),
    );
  },

  async getPublishedTheme() {
    return read((db) => db.theme.published);
  },

  /* ===== MEDIA ===== */
  async listMedia() {
    return delay(read((db) => [...db.media].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))));
  },

  async uploadMedia(file, by) {
    // Random name: never trust the uploaded file name as a path
    const id = randomBytes(8).toString("hex");
    const stored = `${id}.${file.extension}`;
    mkdirSync(UPLOADS_DIR, { recursive: true });
    writeFileSync(path.join(UPLOADS_DIR, stored), file.bytes);
    const item: MediaItem = {
      id,
      url: `${MEDIA_BASE_URL}/uploads/${stored}`,
      fileName: file.fileName.slice(0, 120),
      mimeType: file.mimeType,
      size: file.bytes.length,
      width: file.width,
      height: file.height,
      alt: { ar: "", en: "" },
      uploadedAt: new Date().toISOString(),
      uploadedBy: by,
    };
    return delay(mutate((db) => (db.media.push(item), item)));
  },

  async updateMediaAlt(id, alt) {
    return delay(
      mutate((db) => {
        const item = db.media.find((m) => m.id === id);
        if (item) item.alt = alt;
        return item ?? null;
      }),
    );
  },

  async deleteMedia(id) {
    return delay(
      mutate((db) => {
        const item = db.media.find((m) => m.id === id);
        if (!item) return false;
        db.media = db.media.filter((m) => m.id !== id);
        const file = item.url.split("/").pop();
        if (file && /^[a-f0-9]{16}\.[a-z0-9]{1,8}$/.test(file)) rmSync(path.join(UPLOADS_DIR, file), { force: true });
        return true;
      }),
    );
  },
};
