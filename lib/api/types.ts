/**
 * THE DASHBOARD API CONTRACT
 * ------------------------------------------------------------------
 * Every piece of data the dashboard reads or changes goes through these functions.
 * Two versions exist and both follow this list exactly:
 *   - mock.ts -> sample JSON files (development)
 *   - http.ts -> the real API (ADMIN_API_BASE_URL)
 * Pages never know which one is active (chosen in index.ts by DATA_SOURCE).
 *
 * To add a feature (e.g. orders list): add the function here first, then in mock.ts and http.ts.
 * `token` is the logged-in staff member's API token (from the session) — the API uses it to check permissions.
 */
import type { Permissions } from "@/lib/auth/permissions";
import type {
  NotificationList,
  NotificationQuery,
  NotificationType,
  BranchInput,
  BranchSaveResult,
  StaffAccess,
  StaffInput,
  StaffMember,
  StaffSaveResult,
  StoreSettings,
  AdminBrand,
  BrandInput,
  BrandSaveResult,
  AdminHome,
  HomeContent,
  HomePage,
  HomeSaveResult,
  CheckoutSaveResult,
  CheckoutSettings,
  AdminCoupon,
  CouponInput,
  CouponSaveResult,
  PriceSource,
  PricingState,
  PublicPricing,
  AdminPage,
  ContentPage,
  MenuPage,
  PageContent,
  PageMenu,
  PageSaveResult,
  PageSummary,
  AdminCategory,
  AdminProduct,
  CategoryInput,
  CategorySaveResult,
  GoldPrice,
  ProductInput,
  ProductListQuery,
  ProductListResult,
  ProductSaveResult,
  PublicCatalog,
  AdminCustomer,
  AdminOrder,
  Branch,
  CustomerListQuery,
  CustomerListResult,
  ContactChannel,
  CustomerUpdateResult,
  InboxMessage,
  LocalizedText,
  LoginResult,
  MediaItem,
  MessageListQuery,
  MessageListResult,
  MessageStatus,
  MessageUpdateResult,
  CustomListQuery,
  CustomListResult,
  CustomRequest,
  CustomStatus,
  CustomUpdateResult,
  OrderListQuery,
  OrderListResult,
  OrderStatus,
  OrderUpdateResult,
  OverviewData,
  ReportQuery,
  SalesReport,
  PaymentStatus,
  SiteTheme,
  ThemeState,
} from "@/types";

/** A file received from the upload form, already checked (lib/media/image-check.ts) */
export interface UploadInput {
  fileName: string;
  /** Extension to store it under (already cleaned: lib/media/image-check.ts → safeExtension) */
  extension: string;
  mimeType: MediaItem["mimeType"];
  bytes: Buffer;
  width?: number;
  height?: number;
}

export interface AdminApi {
  /** Staff login. Returns the staff member + an API token. */
  login(email: string, password: string): Promise<LoginResult>;

  /** Sends a reset link if the email belongs to a staff member. Always "succeeds" (never reveals which emails exist). */
  requestPasswordReset(email: string): Promise<void>;

  /* ===== SETTINGS: STAFF & PERMISSIONS ===== (who may do what: lib/staff/rules.ts — the API must check the same) */
  /** Everyone who can log in to the dashboard */
  listStaff(token?: string): Promise<StaffMember[]>;
  getStaff(id: string, token?: string): Promise<StaffMember | null>;
  /** New staff member with a temporary password (they must change it at first login) */
  createStaff(input: StaffInput, password: string, by: LocalizedText, token?: string): Promise<StaffSaveResult>;
  /** Name, email, role / custom permissions, on-off. "last_owner" when no active owner would remain */
  updateStaff(id: string, input: StaffInput, token?: string): Promise<StaffSaveResult>;
  deleteStaff(id: string, token?: string): Promise<StaffSaveResult>;
  /** Give someone a new temporary password (e.g. they forgot theirs) */
  setStaffTempPassword(id: string, password: string, token?: string): Promise<StaffSaveResult>;
  /** The logged-in person changes their own password ("wrong_password" when `current` is wrong) */
  changeOwnPassword(staffId: string, current: string, next: string, token?: string): Promise<StaffSaveResult>;
  /** Re-read on every request (switched off / new permissions work right away). null = account deleted */
  getStaffAccess(staffId: string, token?: string): Promise<StaffAccess | null>;

  /* ===== NOTIFICATIONS ===== (kinds and rules: config/notifications.ts) */
  /**
   * This person's notifications, newest first. The API filters them by the person's permissions
   * (mock: `permissions` is passed in; the real API knows them from the token).
   */
  listNotifications(staffId: string, permissions: Permissions, query: NotificationQuery, token?: string): Promise<NotificationList>;
  /** Mark some as read, or "all" (everything up to now) */
  markNotificationsRead(staffId: string, ids: string[] | "all", token?: string): Promise<void>;
  /** Kinds this person doesn't want ("What to notify me about") */
  setNotificationsOff(staffId: string, off: NotificationType[], token?: string): Promise<void>;

  /* ===== SETTINGS: STORE DETAILS & BRANCHES ===== */
  getStoreSettings(token?: string): Promise<StoreSettings>;
  saveStoreSettings(settings: StoreSettings, token?: string): Promise<StoreSettings>;
  createBranch(input: BranchInput, token?: string): Promise<BranchSaveResult>;
  updateBranch(id: string, input: BranchInput, token?: string): Promise<BranchSaveResult>;
  /** Past orders keep the branch id */
  deleteBranch(id: string, token?: string): Promise<BranchSaveResult>;
  reorderBranches(ids: string[], token?: string): Promise<Branch[]>;
  /** For the storefront in development */
  getPublicStore(): Promise<StoreSettings>;

  /** Numbers, gold prices and latest orders for the Overview page */
  getOverview(token?: string): Promise<OverviewData>;

  /* ===== ORDERS ===== */
  /** Orders list with filters, paging and the count per status (for the tabs) */
  listOrders(query: OrderListQuery, token?: string): Promise<OrderListResult>;
  /** One order with its full history. null = not found */
  getOrder(id: string, token?: string): Promise<AdminOrder | null>;
  /** Move to the next status (rules: lib/orders/workflow.ts). note = reason for cancel/return */
  updateOrderStatus(id: string, change: { status: OrderStatus; note?: string; trackingNumber?: string }, by: LocalizedText, token?: string): Promise<OrderUpdateResult>;
  /** Mark as paid / refunded */
  updatePaymentStatus(id: string, paymentStatus: PaymentStatus, by: LocalizedText, token?: string): Promise<OrderUpdateResult>;
  /** Store branches, in their order (Settings → Branches) */
  getBranches(token?: string): Promise<Branch[]>;
  /** Internal note, visible to staff only */
  addOrderNote(id: string, note: string, by: LocalizedText, token?: string): Promise<OrderUpdateResult>;

  /* ===== CUSTOMERS ===== */
  /** Customers list (accounts + guests) with search, tabs, sorting and paging */
  listCustomers(query: CustomerListQuery, token?: string): Promise<CustomerListResult>;
  /** One customer with orders, addresses and staff notes. null = not found */
  getCustomer(id: string, token?: string): Promise<AdminCustomer | null>;
  /** Stop (disabled = true, reason required) or reactivate an account. Guests have no account to stop. */
  setCustomerDisabled(id: string, disabled: boolean, reason: string | undefined, by: LocalizedText, token?: string): Promise<CustomerUpdateResult>;
  /** Internal note on the customer, visible to staff only */
  addCustomerNote(id: string, note: string, by: LocalizedText, token?: string): Promise<CustomerUpdateResult>;

  /* ===== CONTACT MESSAGES (رسائل التواصل) ===== */
  /** Inbox list with tabs (new / open / done), search and subject filter */
  listMessages(query: MessageListQuery, token?: string): Promise<MessageListResult>;
  /** One message with its replies and notes. null = not found */
  getMessage(id: string, token?: string): Promise<InboxMessage | null>;
  /** Called when a staff member opens a new message: "new" → "open" */
  markMessageRead(id: string, token?: string): Promise<MessageUpdateResult>;
  /** "done" = handled, "open" = reopen */
  setMessageStatus(id: string, status: MessageStatus, by: LocalizedText, token?: string): Promise<MessageUpdateResult>;
  /**
   * Save a reply. channel "email" → the API emails it to the visitor (in their language).
   * "whatsapp" / "phone" → the staff member answered outside the dashboard; this only records it.
   */
  replyToMessage(id: string, reply: { channel: ContactChannel; text: string; markDone?: boolean }, by: LocalizedText, token?: string): Promise<MessageUpdateResult>;
  /** Internal note, visible to staff only */
  addMessageNote(id: string, note: string, by: LocalizedText, token?: string): Promise<MessageUpdateResult>;

  /* ===== CUSTOMIZATION REQUESTS (طلبات التخصيص) — from the website's "Design your piece" page ===== */
  /** List with tabs by status, search and piece-type filter */
  listCustomRequests(query: CustomListQuery, token?: string): Promise<CustomListResult>;
  /** One request with its photos and history. null = not found */
  getCustomRequest(id: string, token?: string): Promise<CustomRequest | null>;
  /** Called when a staff member opens a new request: "new" → "reviewing" */
  markCustomRead(id: string, token?: string): Promise<CustomUpdateResult>;
  /** Change status (optional note; optional price when quoting) */
  setCustomStatus(id: string, change: { status: CustomStatus; note?: string; quote?: number }, by: LocalizedText, token?: string): Promise<CustomUpdateResult>;
  /** Internal note, visible to staff only */
  addCustomNote(id: string, note: string, by: LocalizedText, token?: string): Promise<CustomUpdateResult>;

  /* ===== PRODUCTS ===== */
  /** Products list with search, filters, "tabs" counts and today's price */
  listProducts(query: ProductListQuery, token?: string): Promise<ProductListResult>;
  /** One product. null = not found */
  getProduct(id: string, token?: string): Promise<AdminProduct | null>;
  /** "+ Add product" — a product that is not (yet) in the ERP */
  createProduct(input: ProductInput, token?: string): Promise<ProductSaveResult>;
  /** Save the product form. For ERP products the API keeps SKU / sizes / weight / stock from the ERP. */
  updateProduct(id: string, input: ProductInput, token?: string): Promise<ProductSaveResult>;
  /** Quick show / hide on the website (switch in the list) */
  setProductVisibility(id: string, visible: boolean, token?: string): Promise<ProductSaveResult>;
  /** Only dashboard-made products; ERP products answer "erp_product" (hide them instead) */
  deleteProduct(id: string, token?: string): Promise<ProductSaveResult>;
  /** "Sync with ERP": pull weight, stock and new products now (the ERP also syncs on its own schedule) */
  syncProducts(token?: string): Promise<{ updated: number; at: string }>;
  /** Today's gold price per gram, per karat (for the price preview) */
  getGoldPrices(token?: string): Promise<GoldPrice[]>;

  /* ===== CATEGORIES ===== */
  /** All categories in website order, with product counts */
  listCategories(token?: string): Promise<AdminCategory[]>;
  createCategory(input: CategoryInput, token?: string): Promise<CategorySaveResult>;
  updateCategory(id: string, input: CategoryInput, token?: string): Promise<CategorySaveResult>;
  /** New website order (ids first → last) */
  reorderCategories(ids: string[], token?: string): Promise<AdminCategory[]>;
  /** Only empty categories: "has_products" / "has_children" otherwise */
  deleteCategory(id: string, token?: string): Promise<CategorySaveResult>;
  /** Visible products + categories — read by the storefront in development (DASHBOARD_URL) */
  getPublicCatalog(): Promise<PublicCatalog>;

  /* ===== GOLD PRICES & COUPONS ===== */
  /** Today's gold prices, where they come from, price-lock settings and recent changes */
  getPricing(token?: string): Promise<PricingState>;
  /** Price source (ERP / manual) and checkout price-lock rules */
  savePricingSettings(settings: { source: PriceSource; priceLockMinutes: number; priceChangeTolerancePct: number }, token?: string): Promise<PricingState>;
  /** Manual mode only: new price per gram per karat ("erp_source" when prices come from the ERP) */
  saveGoldPrices(
    prices: { karat: GoldPrice["karat"]; pricePerGram: number }[],
    by: LocalizedText,
    token?: string,
  ): Promise<{ ok: true; changed: number; state: PricingState } | { ok: false; error: "erp_source" }>;
  /** ERP mode: pull the latest prices now (the ERP also sends them on its own schedule) */
  syncGoldPrices(token?: string): Promise<{ changed: number; state: PricingState }>;
  /** Discount codes with how often they were used */
  listCoupons(token?: string): Promise<AdminCoupon[]>;
  createCoupon(input: CouponInput, token?: string): Promise<CouponSaveResult>;
  updateCoupon(code: string, input: CouponInput, token?: string): Promise<CouponSaveResult>;
  deleteCoupon(code: string, token?: string): Promise<CouponSaveResult>;
  /** For the storefront in development: prices, active codes and price-lock rules */
  getPublicPricing(): Promise<PublicPricing>;

  /* ===== SHIPPING & PAYMENT ===== */
  /** Delivery areas, store pickup, VAT & minimum order, payment methods */
  getCheckoutSettings(token?: string): Promise<CheckoutSettings>;
  /** Save them all at once. Refused when the checkout would become unusable (lib/checkout-settings/rules.ts) */
  saveCheckoutSettings(settings: CheckoutSettings, token?: string): Promise<CheckoutSaveResult>;

  /* ===== SITE PAGES ===== */
  /** All pages (About, Contact, FAQ, Terms, custom pages) with status and last change */
  listPages(token?: string): Promise<PageSummary[]>;
  /** One page with its live version and its draft. null = not found */
  getPage(slug: string, token?: string): Promise<AdminPage | null>;
  /** New page — starts as a draft (not on the website) */
  createPage(input: { slug: string; title: LocalizedText; menu: PageMenu }, by: LocalizedText, token?: string): Promise<PageSaveResult>;
  /** Auto-save while editing (visitors don't see drafts) */
  savePageDraft(slug: string, content: PageContent, by: LocalizedText, token?: string): Promise<PageSaveResult>;
  /** Make the draft live */
  publishPage(slug: string, by: LocalizedText, token?: string): Promise<PageSaveResult>;
  /** Throw away unpublished changes */
  discardPageDraft(slug: string, token?: string): Promise<PageSaveResult>;
  /** Take the page off the website (content kept as a draft) */
  unpublishPage(slug: string, by: LocalizedText, token?: string): Promise<PageSaveResult>;
  /** Menu placement (live right away) and, for custom pages, a new link */
  updatePageSettings(slug: string, settings: { menu: PageMenu; slug?: string }, token?: string): Promise<PageSaveResult>;
  /** Custom pages only ("system_page" for About / Contact / FAQ / Terms) */
  deletePage(slug: string, token?: string): Promise<PageSaveResult>;
  /** For the storefront in development: the live page, or the draft when `preview` is true (token already checked) */
  getPublicPage(slug: string, preview: boolean): Promise<ContentPage | null>;
  /** For the storefront in development: live pages placed in the menus */
  getPublicMenu(): Promise<MenuPage[]>;

  /* ===== HOMEPAGE ===== */
  /** The live homepage and the draft being edited */
  getHome(token?: string): Promise<AdminHome>;
  /** Auto-save while editing (visitors don't see drafts) */
  saveHomeDraft(content: HomeContent, by: LocalizedText, token?: string): Promise<HomeSaveResult>;
  /** Make the draft live */
  publishHome(by: LocalizedText, token?: string): Promise<HomeSaveResult>;
  /** Throw away unpublished changes */
  discardHomeDraft(token?: string): Promise<HomeSaveResult>;
  /** Collections the "Our collections" block can show (from the ERP) */
  listBrands(token?: string): Promise<AdminBrand[]>;
  /* Collections manager (dashboard → Collections) */
  createBrand(input: BrandInput, token?: string): Promise<BrandSaveResult>;
  updateBrand(id: string, input: BrandInput, token?: string): Promise<BrandSaveResult>;
  /** New order: ids from first to last */
  reorderBrands(ids: string[], token?: string): Promise<AdminBrand[]>;
  /** Its products stay, without a collection */
  deleteBrand(id: string, token?: string): Promise<BrandSaveResult>;
  /** For the storefront in development: the live homepage, or the draft when `preview` is true (token already checked) */
  getPublicHome(preview: boolean): Promise<HomePage>;

  /* ===== REPORTS ===== */
  /** Everything the Reports page shows for one period (rules: lib/reports/build.ts) */
  getSalesReport(query: ReportQuery, token?: string): Promise<SalesReport>;

  /* ===== WEBSITE THEME (المظهر والتصميم) ===== */
  /** Published theme + the designer's unpublished draft */
  getThemeState(token?: string): Promise<ThemeState>;
  /** Save work in progress (not visible on the website yet) */
  saveThemeDraft(theme: SiteTheme, by: LocalizedText, token?: string): Promise<ThemeState>;
  /** Make the draft live on the website */
  publishTheme(by: LocalizedText, token?: string): Promise<ThemeState>;
  /** Throw away the draft (go back to what is live) */
  discardThemeDraft(token?: string): Promise<ThemeState>;
  /** The live theme only — public, read by the storefront */
  getPublishedTheme(): Promise<SiteTheme>;

  /* ===== MEDIA LIBRARY ===== */
  listMedia(token?: string): Promise<MediaItem[]>;
  uploadMedia(file: UploadInput, by: LocalizedText, token?: string): Promise<MediaItem>;
  updateMediaAlt(id: string, alt: MediaItem["alt"], token?: string): Promise<MediaItem | null>;
  deleteMedia(id: string, token?: string): Promise<boolean>;
}
