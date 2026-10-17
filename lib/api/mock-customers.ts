/**
 * MOCK CUSTOMERS (development only)
 * ------------------------------------------------------------------
 * The customers list is built from (no sample customers):
 *   1) Accounts created on the storefront on your computer — when .env.local has
 *        STOREFRONT_MOCK_DB=../storefront/.mock-db/db.json
 *      Stopping an account is written back into that file, so the customer can't log in on the website.
 *   2) Guests — people who ordered without an account, grouped by phone number.
 * Orders are linked to an account by customerId, then by email, then by phone.
 * Staff notes live in the dashboard's own .mock-db (customerNotes).
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type {
  AdminCustomer,
  AdminOrder,
  Address,
  Customer,
  CustomerListQuery,
  CustomerListResult,
  CustomerNote,
  CustomerSegment,
  CustomerUpdateResult,
  LocalizedText,
} from "@/types";
import { mutate, read } from "./mock-db";
import { allOrders, storefrontFile, toSummary } from "./mock-orders";
import { matchesSearch } from "@/lib/search";
import { storeConfig } from "@/config/store";

type Account = Customer & { disabled?: boolean };

/* ---------- storefront accounts ---------- */
type StorefrontCustomer = Customer & { disabled?: boolean; passwordHash?: string; googleId?: string };

function readStorefront(): { customers?: StorefrontCustomer[] } | null {
  const file = storefrontFile();
  if (!file || !existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function storefrontAccounts(): Account[] {
  return (readStorefront()?.customers ?? []).map(({ passwordHash: _p, googleId: _g, ...c }) => ({ ...c }));
}

/* ---------- linking orders to people ---------- */
/** Last 9 digits: "+20 10 1234 5678", "01012345678" and "٠١٠١٢٣٤٥٦٧٨" all give the same key */
const phoneKey = (phone: string) => {
  const d = phone.replace(/[٠-٩]/g, (x) => String(x.charCodeAt(0) - 0x0660)).replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
};
const guestId = (phone: string) => `guest-${phone.replace(/\D/g, "") || "unknown"}`;
const counts = (o: AdminOrder) => o.status !== "cancelled" && o.status !== "returned";

function build(account: Account | null, orders: AdminOrder[], notes: CustomerNote[]): AdminCustomer {
  const latest = orders[0];
  const counted = orders.filter(counts);
  const totalSpent = counted.reduce((s, o) => s + o.total, 0);
  const lastDelivery = orders.find((o) => o.deliveryMethod === "delivery" && o.shippingAddress);

  // Guests have no saved addresses: show the (different) addresses used in their orders
  const addresses: Address[] = account
    ? account.addresses
    : orders
        .filter((o) => o.shippingAddress)
        .map((o, i) => ({ ...o.shippingAddress!, id: `order-${o.id}`, label: o.number, isDefault: i === 0 }))
        .filter((a, i, all) => all.findIndex((b) => b.street === a.street && b.city === a.city && b.building === a.building) === i);

  const name = account ? `${account.firstName} ${account.lastName}`.trim() : (latest?.customer.name ?? "");
  const phone = account?.phone || latest?.customer.phone || "";
  return {
    id: account ? account.id : guestId(phone),
    kind: account ? "registered" : "guest",
    name,
    firstName: account?.firstName,
    lastName: account?.lastName,
    email: account?.email ?? orders.find((o) => o.customer.email)?.customer.email,
    phone,
    city: addresses.find((a) => a.isDefault)?.city ?? lastDelivery?.shippingAddress?.city,
    signInWith: account?.authProviders ?? [],
    ordersCount: orders.length,
    totalSpent,
    averageOrder: counted.length ? Math.round(totalSpent / counted.length) : 0,
    currency: latest?.currency ?? storeConfig.currency,
    lastOrderAt: latest?.createdAt,
    createdAt: account?.createdAt ?? orders[orders.length - 1]?.createdAt ?? new Date().toISOString(),
    disabled: !!account?.disabled,
    marketingOptIn: !!account?.marketingOptIn,
    birthDate: account?.birthDate,
    avatarUrl: account?.avatarUrl,
    addresses,
    preferredLocale: orders.find((o) => o.locale)?.locale,
    couponsUsed: [...new Set(orders.map((o) => o.couponCode).filter((c): c is string => !!c))],
    orders: orders.map(toSummary),
    notes,
  };
}

/** Every customer (accounts + guests), with their orders */
export function allCustomers(): AdminCustomer[] {
  const accounts = storefrontAccounts();
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const byEmail = new Map(accounts.filter((a) => a.email).map((a) => [a.email.toLowerCase(), a]));
  const byPhone = new Map(accounts.filter((a) => a.phone).map((a) => [phoneKey(a.phone), a]));

  const accountOrders = new Map<string, AdminOrder[]>();
  const guestOrders = new Map<string, AdminOrder[]>();
  for (const o of allOrders()) {
    const email = o.customer.email?.toLowerCase();
    const account = (o.customerId && byId.get(o.customerId)) || (email && byEmail.get(email)) || byPhone.get(phoneKey(o.customer.phone));
    const [map, key] = account ? [accountOrders, account.id] : [guestOrders, phoneKey(o.customer.phone)];
    map.set(key, [...(map.get(key) ?? []), o]);
  }

  const notes = read((db) => db.customerNotes);
  const people = accounts.map((a) => build(a, accountOrders.get(a.id) ?? [], notes[a.id] ?? []));
  for (const orders of guestOrders.values()) {
    const c = build(null, orders, []);
    c.notes = notes[c.id] ?? [];
    people.push(c);
  }
  return people;
}

export function findCustomer(id: string): AdminCustomer | null {
  return allCustomers().find((c) => c.id === id) ?? null;
}

/* ---------- list ---------- */
const inSegment = (c: AdminCustomer, s: CustomerSegment) =>
  s === "all" ? true : s === "registered" ? c.kind === "registered" : s === "guest" ? c.kind === "guest" : s === "repeat" ? c.ordersCount >= 2 : c.disabled;

export function listCustomers(q: CustomerListQuery): CustomerListResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 1), 5000);

  const base = allCustomers().filter((c) => {
    if (q.marketing && !c.marketingOptIn) return false;
    return !q.q || matchesSearch(q.q, [c.name, c.email, c.phone, c.city]);
  });
  const segments: CustomerSegment[] = ["all", "registered", "guest", "repeat", "disabled"];
  const tabCounts = Object.fromEntries(segments.map((s) => [s, base.filter((c) => inSegment(c, s)).length])) as CustomerListResult["counts"];

  const sorted = base
    .filter((c) => inSegment(c, q.segment ?? "all"))
    .sort((a, b) => {
      if (q.sort === "spent") return b.totalSpent - a.totalSpent;
      if (q.sort === "orders") return b.ordersCount - a.ordersCount || b.totalSpent - a.totalSpent;
      if (q.sort === "last_order") return (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "");
      return b.createdAt.localeCompare(a.createdAt);
    });

  return {
    // The list only needs the summary fields
    items: sorted.slice((page - 1) * pageSize, page * pageSize).map(({ firstName: _f, lastName: _l, birthDate: _b, avatarUrl: _a, addresses: _ad, preferredLocale: _p, couponsUsed: _c, averageOrder: _av, orders: _o, notes: _n, ...summary }) => summary),
    total: sorted.length,
    page,
    pageSize,
    counts: tabCounts,
  };
}

/* ---------- changes ---------- */
function addNoteLine(id: string, line: CustomerNote) {
  mutate((db) => {
    db.customerNotes[id] = [...(db.customerNotes[id] ?? []), line];
  });
}

/** Stop / reactivate an account. Stopped customers can't log in on the website. */
export function setCustomerDisabled(id: string, disabled: boolean, reason: string | undefined, by: LocalizedText): CustomerUpdateResult {
  const customer = findCustomer(id);
  if (!customer) return { ok: false, error: "not_found" };
  if (customer.kind === "guest") return { ok: false, error: "guest" };
  if (disabled && !reason?.trim()) return { ok: false, error: "reason_required" };
  if (customer.disabled === disabled) return { ok: true, customer };

  // Written into the storefront's file (its login checks "disabled")
  const file = storefrontFile();
  if (!file || !existsSync(file)) return { ok: false, error: "not_found" };
  const data = JSON.parse(readFileSync(file, "utf8")) as { customers: StorefrontCustomer[] };
  data.customers = data.customers.map((c) => {
    if (c.id !== id) return c;
    const { disabled: _d, ...rest } = c;
    return disabled ? { ...rest, disabled: true } : rest;
  });
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  addNoteLine(id, { at: new Date().toISOString(), type: disabled ? "disabled" : "enabled", note: reason?.trim() || undefined, by });
  return { ok: true, customer: findCustomer(id)! };
}

export function addCustomerNote(id: string, note: string, by: LocalizedText): CustomerUpdateResult {
  if (!findCustomer(id)) return { ok: false, error: "not_found" };
  addNoteLine(id, { at: new Date().toISOString(), type: "note", note: note.trim(), by });
  return { ok: true, customer: findCustomer(id)! };
}
