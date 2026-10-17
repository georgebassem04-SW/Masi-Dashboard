/**
 * ROLES AND PERMISSIONS — who can see / edit what.
 * ------------------------------------------------------------------
 * Every dashboard section has a permission key (orders, products, …).
 * For each key a staff member can have:  "none" | "view" | "edit"
 *
 * Ready-made roles are in ROLE_PRESETS below. The owner can later customise a single staff
 * member's permissions from Settings → Staff (the API will then send `permissions` directly).
 *
 * Use on the server:
 *   can(session, "orders", "edit")     -> true / false
 *   (pages use can() from lib/auth/session.ts and show <NoAccess /> when not allowed)
 */
export const PERMISSION_KEYS = [
  "orders",
  "customers",
  "inbox",
  "custom",
  "reports",
  "products",
  "categories",
  "content",
  "pricing",
  "checkout",
  "settings",
  "staff",
  "theme",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type AccessLevel = "none" | "view" | "edit";
export type Permissions = Record<PermissionKey, AccessLevel>;

export type Role = "owner" | "manager" | "orders" | "content" | "designer" | "viewer";

const all = (level: AccessLevel): Permissions =>
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, level])) as Permissions;

/** ===== READY-MADE ROLES ===== (edit here to change what each role can do) */
export const ROLE_PRESETS: Record<Role, Permissions> = {
  owner: all("edit"),
  manager: { ...all("edit"), staff: "none", settings: "view" },
  orders: { ...all("none"), orders: "edit", customers: "edit", inbox: "edit", custom: "edit", products: "view" },
  content: { ...all("none"), products: "edit", categories: "edit", content: "edit", pricing: "view" },
  // Website designer: the whole look of the site (colours, fonts, logo, texts) + images + page content
  designer: { ...all("none"), theme: "edit", content: "edit", products: "view", categories: "view" },
  viewer: { ...all("none"), orders: "view", customers: "view", custom: "view", reports: "view", products: "view" },
};

const rank: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2 };

/** true when `permissions` allow at least `needed` on `key` */
export function hasAccess(permissions: Permissions, key: PermissionKey, needed: AccessLevel = "view"): boolean {
  return rank[permissions[key] ?? "none"] >= rank[needed];
}
