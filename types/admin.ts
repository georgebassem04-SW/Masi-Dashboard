/**
 * DASHBOARD-ONLY TYPES — staff accounts, overview numbers, list summaries.
 * (Shared shop types like Product and Order are in the other files of this folder.)
 */
import type { Permissions, Role } from "@/lib/auth/permissions";
import type { Brand, Category, GoldPrice, Karat, Metal, Product } from "./product";
import type { Address, Order, OrderStatus, PaymentStatus } from "./order";
import type { Locale, LocalizedText } from "./common";
import type { Branch, CmsSection, ContentPage, HomeSection, HomeSectionType } from "./cms";
import type { CheckoutOptions } from "./checkout";

/** A person who can log in to the dashboard */
export interface StaffUser {
  id: string;
  /** Shown in the top bar and greeting, in the dashboard's current language: { "ar": "…", "en": "…" } */
  name: LocalizedText;
  email: string;
  role: Role;
  /** Filled when the owner customised this person's permissions; otherwise the role preset is used */
  permissions?: Permissions;
  active: boolean;
  lastLoginAt?: string;
  /** Must choose a new password before using the dashboard (the owner gave a temporary one) */
  mustChangePassword?: boolean;
}

/* ===================== SETTINGS: STAFF (الموظفون والصلاحيات) ===================== */

/** A staff member as Settings → Staff sees them (never the password) */
export interface StaffMember extends StaffUser {
  createdAt: string;
  createdBy?: LocalizedText;
}

/** Add / edit a staff member. permissions null = use the role's ready-made permissions (simple mode) */
export interface StaffInput {
  name: LocalizedText;
  email: string;
  role: Role;
  permissions: Permissions | null;
  active: boolean;
}

export type StaffSaveResult = { ok: true; staff: StaffMember } | { ok: false; error: "email_taken" | "not_found" | "last_owner" | "wrong_password" };

/**
 * Re-read on every request, so switching someone off or changing their permissions works right away
 * (not only at their next login). null = the account was deleted.
 */
export interface StaffAccess {
  name: LocalizedText;
  email: string;
  role: Role;
  permissions?: Permissions;
  active: boolean;
  mustChangePassword?: boolean;
}

/* ===================== SETTINGS: STORE DETAILS & BRANCHES ===================== */

/** Add / edit a branch (the id is made from the English name when it's new) */
export type BranchInput = Omit<Branch, "id" | "sortOrder">;
export type BranchSaveResult = { ok: true; branch: Branch } | { ok: false; error: "not_found" };

export type LoginResult =
  | { ok: true; staff: StaffUser; token?: string }
  | { ok: false; error: "invalid_credentials" | "inactive" | "too_many_attempts" };

/** One row in an orders list (not the full order) */
export interface OrderSummary {
  id: string;
  number: string;
  customerName: string;
  city?: string;
  createdAt: string;
  itemsCount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryMethod?: Order["deliveryMethod"];
  phone?: string;
}

/** Everything the Overview page shows, in one API call */
export interface OverviewData {
  salesToday: number;
  /** % change vs yesterday, e.g. 12 or -5 */
  salesChangePct: number;
  newOrders: number;
  awaitingConfirmation: number;
  unreadMessages: number;
  lowStockProducts: number;
  currency: string;
  goldPrices: GoldPrice[];
  recentOrders: OrderSummary[];
}

/** One file in the media library (logos, banners, product photos…) */
/** Family of a library file: decides its icon, and only "image" can be chosen where a picture is needed */
export type MediaKind = "image" | "video" | "audio" | "document" | "other";

export interface MediaItem {
  id: string;
  /** Full address — usable directly by the storefront */
  url: string;
  fileName: string;
  /** e.g. "image/png", "video/mp4", "application/pdf"; unknown files are "application/octet-stream" */
  mimeType: string;
  /** Bytes */
  size: number;
  width?: number;
  height?: number;
  /** Image description for Google and screen readers */
  alt: { ar: string; en: string };
  uploadedAt: string;
  uploadedBy?: LocalizedText;
}

/* ===================== ORDERS ===================== */

/** One line in an order's history (shown as a timeline on the order page) */
export interface OrderEvent {
  at: string;
  type: "created" | "status" | "payment" | "note" | "tracking";
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  /** Free text: cancel reason, internal note, tracking number… */
  note?: string;
  /** Staff member who did it (empty for the customer / the system) */
  by?: LocalizedText;
}

/** An order as the dashboard sees it: the shop order + staff-only details */
export interface AdminOrder extends Order {
  events: OrderEvent[];
  trackingNumber?: string;
  cancelReason?: string;
}

export type OrderPeriod = "today" | "7d" | "30d" | "all";

/** Filters of the orders list (they live in the page address, e.g. /orders?status=pending&q=sara) */
export interface OrderListQuery {
  status?: OrderStatus;
  /** Order number, customer name, phone or email */
  q?: string;
  period?: OrderPeriod;
  payment?: PaymentStatus;
  delivery?: Order["deliveryMethod"];
  page?: number;
  pageSize?: number;
}

export interface OrderListResult {
  items: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** How many orders per status (with the same search/period filters) — for the tabs */
  counts: Record<OrderStatus | "all", number>;
}

export type OrderUpdateError = "not_found" | "invalid_transition" | "reason_required";
export type OrderUpdateResult = { ok: true; order: AdminOrder } | { ok: false; error: OrderUpdateError };

/* ===================== CUSTOMERS ===================== */

/**
 * registered = has an account on the website
 * guest      = ordered without an account (grouped by phone number)
 */
export type CustomerKind = "registered" | "guest";

/** One row in the customers list */
export interface CustomerSummary {
  /** "cus_…" for accounts, "guest-<phone digits>" for guests */
  id: string;
  kind: CustomerKind;
  name: string;
  email?: string;
  phone: string;
  /** City of the default address (or of the latest delivery) */
  city?: string;
  /** How the customer logs in — empty for guests */
  signInWith: ("password" | "google")[];
  ordersCount: number;
  /** Total of all orders except cancelled and returned ones */
  totalSpent: number;
  currency: string;
  lastOrderAt?: string;
  /** Sign-up date (guests: date of the first order) */
  createdAt: string;
  /** Account stopped by the store — can't log in on the website */
  disabled: boolean;
  /** Agreed to receive offers by email */
  marketingOptIn: boolean;
}

/** A line in the customer's staff-only history: internal note, or account stopped / reactivated */
export interface CustomerNote {
  at: string;
  type: "note" | "disabled" | "enabled";
  note?: string;
  by?: LocalizedText;
}

/** The full customer profile */
export interface AdminCustomer extends CustomerSummary {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  avatarUrl?: string;
  /** Saved addresses (guests: the addresses used in their orders) */
  addresses: Address[];
  /** Language of the latest order */
  preferredLocale?: Locale;
  couponsUsed: string[];
  averageOrder: number;
  /** Newest first */
  orders: OrderSummary[];
  notes: CustomerNote[];
}

/** Tabs above the customers list */
export type CustomerSegment = "all" | "registered" | "guest" | "repeat" | "disabled";
export type CustomerSort = "newest" | "spent" | "orders" | "last_order";

/** Filters of the customers list (kept in the page address, e.g. /customers?segment=repeat&sort=spent) */
export interface CustomerListQuery {
  segment?: CustomerSegment;
  /** Name, phone or email */
  q?: string;
  sort?: CustomerSort;
  /** true = only customers who accept offers */
  marketing?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CustomerListResult {
  items: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
  /** How many customers per tab (with the same search) */
  counts: Record<CustomerSegment, number>;
}

export type CustomerUpdateResult =
  | { ok: true; customer: AdminCustomer }
  | { ok: false; error: "not_found" | "guest" | "reason_required" };

/* ===================== CONTACT MESSAGES (رسائل التواصل) ===================== */

/**
 * new  = nobody opened it yet (bold in the list, counted on the overview)
 * open = read, still needs an answer
 * done = handled ("تم التعامل معها")
 */
export type MessageStatus = "new" | "open" | "done";
export type ContactChannel = "phone" | "whatsapp" | "email";

/** A line in the message history: reply sent, internal note, or status change */
export interface MessageEvent {
  at: string;
  type: "reply" | "note" | "status";
  /** For replies: how it was sent */
  channel?: ContactChannel;
  text?: string;
  status?: MessageStatus;
  by?: LocalizedText;
}

/** A message from the website's "Contact us" form */
export interface InboxMessage {
  id: string;
  /** Number shown to the visitor after sending, e.g. MSG-482913 */
  reference: string;
  name: string;
  phone: string;
  email?: string;
  /** Subject id chosen in the form (labels: config/contact-subjects.ts) */
  subject: string;
  branchId?: string;
  preferredChannel: ContactChannel;
  message: string;
  /** Language the visitor used — reply in the same language */
  locale: Locale;
  pageUrl?: string;
  createdAt: string;
  status: MessageStatus;
  /** Oldest first */
  events: MessageEvent[];
}

/** One row in the inbox list */
export type MessageSummary = Pick<InboxMessage, "id" | "reference" | "name" | "subject" | "createdAt" | "status" | "preferredChannel"> & {
  /** First words of the message */
  preview: string;
  replied: boolean;
};

export interface MessageListQuery {
  status?: MessageStatus;
  /** Name, phone, email, reference or words in the message */
  q?: string;
  subject?: string;
  page?: number;
  pageSize?: number;
}

export interface MessageListResult {
  items: MessageSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<MessageStatus | "all", number>;
}

export type MessageUpdateResult = { ok: true; message: InboxMessage } | { ok: false; error: "not_found" | "no_email" };

/* ===================== CUSTOMIZATION REQUESTS (طلبات التخصيص) ===================== */

/**
 * A customer's "Design your piece" request from the website (page /custom-order): photos + description.
 *   new       = nobody opened it yet
 *   reviewing = being studied (opening a new one moves it here)
 *   quoted    = price / timing sent to the customer
 *   in_work   = customer agreed, piece is being made
 *   done      = delivered
 *   rejected  = can't be made / customer declined
 * Change the list here + texts in dictionaries → "custom.status".
 */
export const CUSTOM_STATUSES = ["new", "reviewing", "quoted", "in_work", "done", "rejected"] as const;
export type CustomStatus = (typeof CUSTOM_STATUSES)[number];
export type CustomPieceType = "ring" | "necklace" | "bracelet" | "earrings" | "set" | "other";

export interface CustomEvent {
  at: string;
  type: "note" | "status";
  text?: string;
  status?: CustomStatus;
  by?: LocalizedText;
}

export interface CustomRequest {
  id: string;
  /** Number shown to the customer after sending, e.g. CUS-482913 */
  reference: string;
  name: string;
  phone: string;
  email?: string;
  preferredChannel: ContactChannel;
  pieceType: CustomPieceType;
  /** "any" = no preference */
  karat: "any" | "18" | "21" | "24";
  /** Free text, may be empty */
  budget: string;
  description: string;
  /** Photo addresses the dashboard can show (staff only) */
  photos: { url: string; width?: number; height?: number }[];
  /** Set when the customer was logged in on the website */
  customerId?: string;
  locale: Locale;
  createdAt: string;
  status: CustomStatus;
  /** Price sent to the customer (optional, saved with the "quoted" status) */
  quote?: number;
  /** Oldest first */
  events: CustomEvent[];
}

export type CustomSummary = Pick<CustomRequest, "id" | "reference" | "name" | "pieceType" | "createdAt" | "status"> & {
  preview: string;
  photo?: string;
  photoCount: number;
};

export interface CustomListQuery {
  status?: CustomStatus;
  pieceType?: CustomPieceType;
  q?: string;
  page?: number;
  pageSize?: number;
  /** The open request (/custom-requests?r=<id>) */
  r?: string;
}

export interface CustomListResult {
  items: CustomSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<CustomStatus | "all", number>;
}

export type CustomUpdateResult = { ok: true; request: CustomRequest } | { ok: false; error: "not_found" };

/* ===================== REPORTS (التقارير) ===================== */

export type ReportPeriod = "today" | "7d" | "30d" | "90d" | "12m" | "custom";

export interface ReportQuery {
  period: ReportPeriod;
  /** For "custom": first and last day, YYYY-MM-DD (store time zone) */
  from?: string;
  to?: string;
}

/**
 * Money and quantity totals for a period. Only orders that count as sales are included:
 * everything except cancelled and returned orders (see lib/reports/build.ts).
 */
export interface SalesTotals {
  /** What customers paid: items − discount + VAT + shipping */
  sales: number;
  orders: number;
  averageOrder: number;
  /** Pieces sold */
  pieces: number;
  /** Gold sold, grams */
  goldGrams: number;
  /** Breakdown of the items: gold value + making charges + stones */
  goldValue: number;
  making: number;
  stones: number;
  discounts: number;
  vat: number;
  shipping: number;
}

export interface SalesReport {
  currency: string;
  /** First and last day shown, YYYY-MM-DD */
  from: string;
  to: string;
  /** Chart bars: one per day, or one per month for long periods */
  groupBy: "day" | "month";
  totals: SalesTotals;
  /** Same length of time just before, for the "+12%" comparisons */
  previous: SalesTotals;
  series: { key: string; sales: number; orders: number; goldGrams: number }[];
  byCategory: { id: string; name: LocalizedText; sales: number; pieces: number }[];
  byKarat: { karat: number; grams: number; pieces: number; sales: number }[];
  topProducts: { productId: string; name: LocalizedText; imageUrl?: string; pieces: number; sales: number }[];
  /** Every order placed in the period (cancelled and returned included) */
  byStatus: Partial<Record<OrderStatus, number>>;
  byPayment: { method: Order["paymentMethod"]; orders: number; sales: number }[];
  byDelivery: { method: Order["deliveryMethod"]; orders: number; sales: number }[];
  topCities: { city: string; orders: number; sales: number }[];
  coupons: { code: string; orders: number; discount: number }[];
  /** Customers who ordered in the period: first order ever vs. ordered before */
  customers: { new: number; returning: number };
  cancelled: { orders: number; value: number };
  returned: { orders: number; value: number };
}

/* ===================== PRODUCTS & CATEGORIES ===================== */

/**
 * erp    = comes from the ERP: SKU, weight, stock (and fixed prices) are read-only here, updated by "Sync with ERP"
 * manual = added in the dashboard: everything is editable
 */
export type ProductSource = "erp" | "manual";

/** A product as the dashboard sees it: the shop product + dashboard-only fields */
export interface AdminProduct extends Product {
  /** false = hidden from the website (still kept, and still in the ERP) */
  visible: boolean;
  source: ProductSource;
  updatedAt: string;
}

export type ProductStock = "in_stock" | "low_stock" | "out_of_stock" | "made_to_order";

/** One row in the products list */
export interface ProductSummary {
  id: string;
  sku: string;
  slug: string;
  name: LocalizedText;
  imageUrl?: string;
  categoryId: string;
  karat: Karat;
  metal: Metal;
  /** Lightest and heaviest size, grams */
  minWeight: number;
  maxWeight: number;
  variantsCount: number;
  /** Pieces in stock, all sizes together */
  stockQty: number;
  stock: ProductStock;
  /** "From" price with today's gold price (same formula as the website) */
  price: number;
  visible: boolean;
  isFeatured: boolean;
  isNew: boolean;
  source: ProductSource;
}

export interface ProductListQuery {
  /** Name (Arabic or English), SKU or tag */
  q?: string;
  categoryId?: string;
  karat?: Karat;
  stock?: Exclude<ProductStock, "made_to_order">;
  visibility?: "visible" | "hidden";
  sort?: "newest" | "name" | "price_asc" | "price_desc" | "stock_asc";
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  counts: { all: number; visible: number; hidden: number; out_of_stock: number };
  currency: string;
  /** Last "Sync with ERP" */
  lastSyncAt?: string;
}

/** What the product form sends. For ERP products the API ignores sku / weight / stock changes. */
export type ProductInput = Pick<
  AdminProduct,
  "name" | "description" | "categoryId" | "brandId" | "slug" | "metal" | "karat" | "pricingMode" | "makingCharge" | "stones" | "images" | "tags" | "isFeatured" | "isNew" | "visible" | "certificate" | "sku" | "variants"
>;

export type ProductSaveResult = { ok: true; product: AdminProduct } | { ok: false; error: "not_found" | "slug_taken" | "sku_taken" | "category_missing" | "erp_product" };

/** A category as the dashboard sees it */
export interface AdminCategory extends Category {
  /** false = hidden from the website menu and pages */
  visible: boolean;
  /** Products in this category (visible and hidden) */
  productCount: number;
}

export type CategoryInput = Pick<AdminCategory, "name" | "slug" | "description" | "parentId" | "image" | "banner" | "bannerStyle" | "bannerHeight" | "visible">;

export type CategorySaveResult =
  | { ok: true; category: AdminCategory }
  | { ok: false; error: "not_found" | "slug_taken" | "has_products" | "has_children" | "bad_parent" };

/** What the storefront reads in development (DASHBOARD_URL): only visible products and categories */
export interface PublicCatalog {
  products: Product[];
  categories: Category[];
  /** Visible collections, in website order */
  brands: Brand[];
}

/* ===================== SITE PAGES (صفحات الموقع) ===================== */

/** Where the page link appears on the website */
export type PageMenu = "header" | "footer" | "none";

/** Section types the page editor offers (all are drawn by the storefront's SectionRenderer) */
export type PageSectionType = "page_hero" | "hero" | "banner" | "rich_text" | "image_text" | "stats" | "features" | "timeline" | "faq" | "branches" | "cta" | "contact" | "custom_order" | "social_feed" | "product_spotlight" | "locations";
export type PageSection = Extract<CmsSection, { type: PageSectionType }>;

/** One version of a page (the live one, or the draft being edited) */
export interface PageContent {
  title: LocalizedText;
  seo?: ContentPage["seo"];
  sections: PageSection[];
}

export interface AdminPage {
  slug: string;
  menu: PageMenu;
  /** about, contact, faq, terms: their own fixed address — can't be renamed or deleted */
  system: boolean;
  /** What visitors see. null = never published (or taken offline) */
  published: PageContent | null;
  publishedAt?: string;
  publishedBy?: LocalizedText;
  /** Unpublished changes, saved automatically while editing. null = nothing new */
  draft: PageContent | null;
  draftSavedAt?: string;
  draftBy?: LocalizedText;
  createdAt: string;
}

/**
 * published = live, no pending changes · changed = live + unpublished changes · draft = not on the website
 */
export type PageStatus = "published" | "changed" | "draft";

export interface PageSummary {
  slug: string;
  title: LocalizedText;
  menu: PageMenu;
  system: boolean;
  status: PageStatus;
  sectionsCount: number;
  updatedAt: string;
  updatedBy?: LocalizedText;
}

export type PageSaveResult =
  | { ok: true; page: AdminPage }
  | { ok: false; error: "not_found" | "slug_taken" | "system_page" | "nothing_to_publish" };

/* ===================== HOMEPAGE (الصفحة الرئيسية) ===================== */

/** Blocks the homepage editor offers: all of them except the page title banner and the contact form (those belong to pages) */
export type HomeBlockType = Exclude<HomeSectionType, "page_hero" | "contact" | "custom_order">;

/** One version of the homepage (the live one, or the draft being edited) */
export interface HomeContent {
  sections: HomeSection[];
}

/** The homepage is always live: "published" is what visitors see, "draft" the unpublished changes */
export interface AdminHome {
  published: HomeContent;
  publishedAt?: string;
  publishedBy?: LocalizedText;
  draft: HomeContent | null;
  draftSavedAt?: string;
  draftBy?: LocalizedText;
}

export type HomeSaveResult = { ok: true; home: AdminHome } | { ok: false; error: "nothing_to_publish" };

/**
 * A product collection ("Our collections" block on the homepage, "Collection" in the product filter).
 * Managed in the dashboard → Collections (/collections). In the code a collection is called "brand".
 */
export interface AdminBrand extends Brand {
  /** false = hidden from the website (homepage block and filter) */
  visible: boolean;
  /** Products in this collection (visible and hidden) */
  productCount: number;
}

/** What the collection form sends */
export type BrandInput = Pick<AdminBrand, "name" | "slug" | "logo" | "visible">;

export type BrandSaveResult = { ok: true; brand: AdminBrand } | { ok: false; error: "not_found" | "slug_taken" };

/* ===================== GOLD PRICES & COUPONS (أسعار الذهب والكوبونات) ===================== */

/** erp = prices come from the ERP automatically (read-only here) · manual = typed in the dashboard */
export type PriceSource = "erp" | "manual";

/** One change of a karat's price, for the history list */
export interface GoldPriceChange {
  at: string;
  karat: Karat;
  from: number;
  to: number;
  source: PriceSource;
  by?: LocalizedText;
}

export interface PricingState {
  source: PriceSource;
  currency: string;
  /** Today's price per gram, highest karat first */
  prices: GoldPrice[];
  /** Last time prices were pulled from the ERP */
  lastSyncAt?: string;
  /** Checkout keeps the price for this many minutes */
  priceLockMinutes: number;
  /** Small gold-price rises (up to this %) during checkout don't interrupt the customer */
  priceChangeTolerancePct: number;
  /** Newest first */
  history: GoldPriceChange[];
}

/** A discount code, as the checkout uses it (same shape as the storefront's Coupon) */
export interface CouponInput {
  /** Upper-case letters and digits, e.g. WELCOME10 */
  code: string;
  /** percent = % off · amount = fixed amount off · free_shipping = no delivery fee */
  type: "percent" | "amount" | "free_shipping";
  value: number;
  /** "making_charge" = only the making charge (default for gold) · "subtotal" = the whole order */
  appliesTo: "making_charge" | "subtotal";
  /** Items total must reach this amount */
  minSubtotal: number;
  /** Largest discount one order can get (percent coupons) */
  maxDiscount?: number;
  /** What the customer sees at checkout, e.g. "10% off making charges" */
  label: LocalizedText;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  /** Total number of orders that can use it (empty = unlimited) */
  usageLimit?: number;
  /** Only these products get the discount (product ids). Empty / missing = every product */
  productIds?: string[];
  /**
   * true = SPECIAL OFFER: no code to type — the website shows the lower price on the product itself.
   * The code is then only an internal name (made automatically, e.g. OFFER-7K2M).
   */
  automatic?: boolean;
}

/**
 * active · scheduled (starts later) · expired · used_up (limit reached) · paused (switched off)
 */
export type CouponStatus = "active" | "scheduled" | "expired" | "used_up" | "paused";

export interface AdminCoupon extends CouponInput {
  /** Orders that used it (cancelled / returned not counted) */
  usedCount: number;
  /** Total discount given through it */
  discountGiven: number;
  status: CouponStatus;
  createdAt: string;
}

export type CouponSaveResult = { ok: true; coupon: AdminCoupon } | { ok: false; error: "not_found" | "code_taken" };

/** What the storefront reads in development (DASHBOARD_URL) */
export interface PublicPricing {
  goldPrices: GoldPrice[];
  coupons: (CouponInput & { usedCount: number })[];
  priceLockMinutes: number;
  priceChangeTolerancePct: number;
  /** Full checkout options (Shipping & payment + price lock) */
  checkout: CheckoutOptions;
}

/* ===================== SHIPPING & PAYMENT (الشحن والدفع) ===================== */

/**
 * Everything the checkout page uses, as edited in Shipping & payment.
 * (Price lock minutes / tolerance are edited in Gold prices & coupons and left out here.)
 */
export type CheckoutSettings = Omit<CheckoutOptions, "priceLockMinutes" | "priceChangeTolerancePct">;

export type CheckoutSaveResult = { ok: true; settings: CheckoutSettings } | { ok: false; error: "no_way_to_receive" | "no_payment_for_delivery" | "no_payment_for_pickup" };

/* ===================== NOTIFICATIONS (الإشعارات) ===================== */

/**
 * What can be notified. Each kind belongs to a section (config/notifications.ts): staff only get the kinds
 * of sections they may view, and each person can switch kinds off for themselves.
 */
export type NotificationType = "new_order" | "order_waiting" | "order_cancelled" | "new_message" | "new_custom" | "low_stock" | "out_of_stock" | "new_customer" | "gold_price";

export interface AdminNotification {
  /** Stable id made from what it's about (e.g. "order:ORD-1024") — read marks are kept per staff member */
  id: string;
  type: NotificationType;
  createdAt: string;
  read: boolean;
  /** Values for the text (dictionaries → notifications.types.<type>), e.g. { number: "ORD-1024", name: "Sara", total: 15400 } */
  params: Record<string, string | number>;
  /** Page that opens when it's clicked */
  href: string;
}

export interface NotificationQuery {
  filter?: "all" | "unread";
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}

export interface NotificationList {
  items: AdminNotification[];
  /** With the same filters */
  total: number;
  /** All unread for this person (for the bell) */
  unread: number;
  /** Unread per kind (for the filter chips) */
  unreadByType: Partial<Record<NotificationType, number>>;
  /** Kinds this person can get (their permissions), and the ones they switched off */
  available: NotificationType[];
  off: NotificationType[];
  page: number;
  pageSize: number;
}
