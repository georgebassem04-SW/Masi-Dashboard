/**
 * CART, ORDER, ADDRESS and CUSTOMER TYPES.
 */
import type { LocalizedText } from "./common";

export interface CartItem {
  productId: string;
  variantId: string;
  slug: string;
  name: LocalizedText;
  imageUrl?: string;
  karat: number;
  weightGrams: number;
  size?: string;
  quantity: number;
  /** Unit price at the moment it was added. Re-priced at checkout because gold prices move. */
  unitPrice: number;
  currency: string;
  /** Pieces available when added (from stock). The cart never lets quantity go above this. */
  maxQty?: number;
}

export interface Address {
  id: string;
  /** e.g. "Home", "Work" */
  label: string;
  fullName: string;
  phone: string;
  country: string;
  /** Delivery area id from checkout options (decides the shipping fee) */
  shippingZoneId?: string;
  city: string;
  area?: string;
  street: string;
  building?: string;
  notes?: string;
  isDefault: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_pickup"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type DeliveryMethod = "delivery" | "store_pickup";
export type PaymentMethod = "cash_on_delivery" | "card" | "bank_transfer" | "pay_in_store";

export interface OrderLine {
  productId: string;
  variantId: string;
  sku: string;
  name: LocalizedText;
  karat: number;
  weightGrams: number;
  quantity: number;
  goldPricePerGram: number;
  makingCharge: number;
  stonesPrice: number;
  /** Price of one piece */
  unitPrice: number;
  lineTotal: number;
  size?: string;
  imageUrl?: string;
}

export type PaymentStatus = "pending" | "awaiting_transfer" | "paid" | "failed" | "refunded";

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  createdAt: string;
  customer: { name: string; phone: string; email?: string };
  /** Set when the order was placed while logged in */
  customerId?: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  vat: number;
  shipping: number;
  total: number;
  currency: string;
  deliveryMethod: DeliveryMethod;
  /** Id of the payment option chosen (see CheckoutOptions.paymentMethods) */
  paymentMethodId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress?: Omit<Address, "id" | "label" | "isDefault">;
  pickupBranchId?: string;
  notes?: string;
  /** Language the customer ordered in (emails are sent in this language) */
  locale?: "ar" | "en";
  statusHistory: { status: OrderStatus; at: string }[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate?: string; // YYYY-MM-DD
  marketingOptIn: boolean;
  addresses: Address[];
  /** How this customer can sign in */
  authProviders: ("password" | "google")[];
  avatarUrl?: string;
  createdAt: string;
}

/** Who is logged in. The token comes from the dashboard and is sent with every account request. */
export interface CustomerAuth {
  customerId: string;
  token?: string;
}

export type AddressInput = Omit<Address, "id">;
export type ProfileInput = Pick<Customer, "firstName" | "lastName" | "email" | "phone" | "birthDate" | "marketingOptIn">;

/** Result of login / register / Google sign-in */
export type AuthResult =
  | { ok: true; customer: Customer; token?: string }
  | { ok: false; error: "email_taken" | "invalid_credentials" | "google_only" | "not_found" | "weak_password" | "wrong_password" | "account_disabled" };
