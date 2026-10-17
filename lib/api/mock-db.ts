/**
 * MOCK DATABASE (development only)
 * ------------------------------------------------------------------
 * While DATA_SOURCE=mock, changes made in the dashboard are saved in:
 *     .mock-db/db.json        theme, media, products, categories, site pages, homepage, staff, branches, store details,
 *                             staff notes / history for orders, customers, messages and custom requests — and every change
 *     .mock-db/uploads/       uploaded image files (served at /uploads/<file>)
 * Created automatically, ignored by git. Delete the folder to start fresh.
 * With the real API (DATA_SOURCE=http) this file is not used.
 */
import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NotificationType, AdminHome, AdminPage, Branch, StaffMember, StoreSettings, AdminProduct, Brand, CheckoutSettings, CouponInput, PricingState, Category, CustomerNote, CustomEvent, CustomStatus, MediaItem, MessageEvent, MessageStatus, OrderEvent, ThemeState } from "@/types";
import { DEFAULT_THEME } from "@/config/theme-defaults";

interface Db {
  theme: ThemeState;
  media: MediaItem[];
  /** Staff-only details for orders that live in the storefront's own mock database */
  orderExtras: Record<string, { events: OrderEvent[]; trackingNumber?: string; cancelReason?: string }>;
  /** Staff-only notes per customer (sample, storefront and guest customers) */
  customerNotes: Record<string, CustomerNote[]>;
  /** Status and history for messages that live in the storefront's own mock database */
  messageExtras: Record<string, { status: MessageStatus; events: MessageEvent[] }>;
  /** Status, price and history for customization requests that live in the storefront's own mock database */
  customExtras: Record<string, { status: CustomStatus; quote?: number; events: CustomEvent[] }>;
  /** Products (copied from mock-data/products.json the first time = "what the ERP sent") */
  products: AdminProduct[] | null;
  /** Categories (copied from mock-data/categories.json the first time) */
  categories: (Category & { visible: boolean })[] | null;
  /** Collections (copied from mock-data/brands.json the first time) */
  brands?: (Brand & { visible: boolean })[] | null;
  /** Last "Sync with ERP" */
  lastSyncAt?: string;
  /** Site pages (copied from mock-data/pages/*.json the first time) */
  pages: AdminPage[] | null;
  /** Gold prices + price lock settings (first time: mock-data/gold-prices.json + checkout-options.json) */
  pricing: Omit<PricingState, "currency"> | null;
  /** Discount codes (first time: mock-data/coupons.json) */
  coupons: (CouponInput & { createdAt: string })[] | null;
  /** Delivery areas, payment methods, VAT, store pickup (first time: mock-data/checkout-options.json) */
  checkout: CheckoutSettings | null;
  /** Homepage blocks (first time: mock-data/home.json) */
  home: AdminHome | null;
  /** Staff accounts + password hashes (first time: mock-data/staff.json) */
  staff: (StaffMember & { passwordHash: string })[] | null;
  /** Branches (first time: mock-data/branches.json) */
  branches: Branch[] | null;
  /** Contact details & social links (first time: mock-data/store.json) */
  store: StoreSettings | null;
  /** Per staff member: notifications already read, "read all" time, kinds switched off */
  notificationState: Record<string, { readIds: string[]; readAllAt?: string; off: NotificationType[] }>;
  /** Stock taken by each website order (and whether it was given back after cancel / return) — mock-stock.ts */
  stockLedger: Record<string, { lines: { productId: string; variantId: string; qty: number }[]; restored: boolean }>;
}

/**
 * Where the sample data is saved.
 *   - On your computer: the project's own ".mock-db" folder.
 *   - On Vercel (or any host whose project folder is read-only): its temporary folder (/tmp), so logging in and
 *     saving work for a DEMO. That folder is wiped whenever the host restarts the app, so changes don't last there.
 *   - MOCK_DB_DIR in the settings (.env.local / Vercel → Environment Variables) chooses another folder.
 */
export const MOCK_DIR = process.env.MOCK_DB_DIR || (process.env.VERCEL ? "/tmp/mock-db" : path.join(process.cwd(), ".mock-db"));
export const UPLOADS_DIR = path.join(MOCK_DIR, "uploads");
const FILE = path.join(MOCK_DIR, "db.json");

const empty = (): Db => ({
  theme: { published: structuredClone(DEFAULT_THEME), publishedAt: null, publishedBy: null, draft: null, draftSavedAt: null },
  media: [],
  orderExtras: {},
  customerNotes: {},
  messageExtras: {},
  customExtras: {},
  products: null,
  categories: null,
  pages: null,
  pricing: null,
  coupons: null,
  checkout: null,
  home: null,
  staff: null,
  branches: null,
  store: null,
  notificationState: {},
  stockLedger: {},
});

function load(): Db {
  try {
    if (existsSync(FILE)) return { ...empty(), ...(JSON.parse(readFileSync(FILE, "utf8")) as Partial<Db>) };
  } catch (error) {
    console.error("[mock-db] could not read db.json, starting empty", error);
  }
  return empty();
}

/** Read, change, save (synchronous so two requests can't overwrite each other) */
export function mutate<T>(fn: (db: Db) => T): T {
  const db = load();
  const result = fn(db);
  mkdirSync(MOCK_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(db, null, 2), "utf8");
  return result;
}

export function read<T>(fn: (db: Db) => T): T {
  return fn(load());
}
