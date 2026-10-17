/**
 * CHECKOUT TYPES — everything the checkout page needs from the dashboard, and what it sends back.
 *
 *   GET  /storefront/checkout-options -> CheckoutOptions  (shipping zones, payment methods, rules)
 *   POST /storefront/checkout/quote   -> Quote            (re-priced cart with today's gold rate)
 *   POST /storefront/orders           -> PlacedOrder      (creates the order in the dashboard/ERP)
 *   GET  /storefront/orders/:number   -> Order            (order success page)
 */
import type { LocalizedText } from "./common";
import type { DeliveryMethod, PaymentMethod } from "./order";

/** An area we deliver to, with its fee. Managed in the dashboard (Level 6: shipping). */
export interface ShippingZone {
  id: string;
  name: LocalizedText; // e.g. governorate "Cairo"
  fee: number;
  /** Free delivery when the order subtotal reaches this amount */
  freeOver?: number;
  /** Delivery time, e.g. { ar: "١–٢ يوم", en: "1–2 days" } */
  deliveryTime: LocalizedText;
  isActive: boolean;
}

/** A payment option shown at checkout. Managed in the dashboard (Level 6: payment). */
export interface PaymentMethodOption {
  id: string;
  type: PaymentMethod;
  label: LocalizedText;
  description?: LocalizedText;
  /** Shown after the order is placed (e.g. bank account details) */
  instructions?: LocalizedText;
  /** Hide this option above this order total (e.g. cash on delivery max 50,000) */
  maxOrderTotal?: number;
  /** Which delivery methods allow this payment option */
  availableFor: DeliveryMethod[];
  isActive: boolean;
}

export interface CheckoutOptions {
  shippingZones: ShippingZone[];
  paymentMethods: PaymentMethodOption[];
  /**
   * What VAT is charged on:
   *  - "total"         : the whole order
   *  - "making_charge" : only the making charge (common for gold jewelry)
   *  - "none"          : prices already include VAT
   */
  vatBase: "total" | "making_charge" | "none";
  vatPercent: number;
  minOrderTotal?: number;
  /** How long a quoted price stays valid before re-pricing (gold rate moves) */
  priceLockMinutes: number;
  /**
   * If the gold price moved UP while the customer was checking out by no more than this %,
   * the order is still placed at the total they saw (the store absorbs the small difference).
   * Bigger rises ask the customer to confirm the new total. Price drops always go through.
   * Set in the dashboard → Gold prices & coupons. Default 0.
   */
  priceChangeTolerancePct?: number;
  /** Link to the terms page the customer must accept */
  termsUrl: string;
  /**
   * Customers can collect from a branch (dashboard → Shipping & payment → Store pickup).
   * Missing = use config/clients/<client>.ts → features.storePickup.
   */
  storePickup?: boolean;
}

export interface QuoteRequest {
  items: { variantId: string; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  shippingZoneId?: string;
  couponCode?: string;
}

export interface QuoteLine {
  productId: string;
  variantId: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  imageUrl?: string;
  karat: number;
  weightGrams: number;
  size?: string;
  quantity: number;
  /** Pieces available now (quantity is reduced to this if needed) */
  available: number;
  goldPricePerGram: number;
  makingCharge: number;
  stonesPrice: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  lines: QuoteLine[];
  /** Cart lines that can't be bought any more (sold out or unpublished) */
  unavailable: { variantId: string; reason: "out_of_stock" | "not_found" }[];
  subtotal: number;
  discount: number;
  coupon?: {
    code: string;
    valid: boolean;
    label?: LocalizedText;
    /** Why the code didn't work (shown to the customer) */
    reason?: "not_found" | "not_started" | "expired" | "used_up" | "min_subtotal";
    /** For "min_subtotal": the amount the items must reach */
    minSubtotal?: number;
    /** The code gives free delivery */
    freeShipping?: boolean;
  };
  shipping: number;
  vat: number;
  total: number;
  currency: string;
  /** ISO time until which these prices are guaranteed */
  validUntil: string;
  /** Problems that block placing the order */
  blockers: ("empty" | "below_minimum" | "zone_unavailable" | "pickup_unavailable")[];
}

export interface PlaceOrderRequest extends QuoteRequest {
  customer: { name: string; phone: string; email?: string };
  address?: { governorate: string; city: string; area?: string; street: string; building?: string; notes?: string };
  pickupBranchId?: string;
  paymentMethodId: string;
  notes?: string;
  locale: "ar" | "en";
  /** The total the customer saw. If today's price differs, the order is refused with the new quote. */
  expectedTotal: number;
  /** Random id per checkout attempt, so a double click never creates two orders */
  idempotencyKey: string;
  /** Logged-in customer (added on the server from the session, never sent by the browser) */
  customerAuth?: { customerId: string; token?: string };
}

export type PlacedOrder =
  | { ok: true; orderNumber: string; total: number; paymentRedirectUrl?: string }
  | { ok: false; error: "price_changed"; quote: Quote }
  | { ok: false; error: "unavailable" | "blocked" | "invalid_payment"; quote?: Quote };
