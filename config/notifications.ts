/**
 * NOTIFICATIONS — what the bell tells staff about.
 * ------------------------------------------------------------------
 *   type        -> text in dictionaries → "notifications.types.<type>"
 *   permission  -> only staff who can see this section get it (lib/auth/permissions.ts)
 *   icon / tone -> how it looks in the list (any icon from https://lucide.dev/icons)
 * Rules (change the numbers here):
 *   - "Waiting for confirmation": a new order still not confirmed after ORDER_WAITING_HOURS
 *   - Low stock: LOW_STOCK_AT pieces or fewer (lib/catalog/helpers.ts — same rule as the website)
 *   - Only the last LOOKBACK_DAYS days are shown
 * Each person can switch kinds off for themselves (Notifications → "What to notify me about").
 */
import { AlertTriangle, Ban, Clock, Coins, Gem, MessageSquare, PackageX, ShoppingBag, UserPlus, type LucideIcon } from "lucide-react";
import type { NotificationType } from "@/types";
import type { PermissionKey } from "@/lib/auth/permissions";

export const ORDER_WAITING_HOURS = 24;
export const LOOKBACK_DAYS = 30;
/** How often the bell checks for new notifications */
export const BELL_REFRESH_SECONDS = 60;

export interface NotificationKind {
  type: NotificationType;
  permission: PermissionKey;
  icon: LucideIcon;
  tone: "gold" | "blue" | "red" | "green" | "gray";
}

/** In this order in the filters and the settings */
export const NOTIFICATION_KINDS: NotificationKind[] = [
  { type: "new_order", permission: "orders", icon: ShoppingBag, tone: "gold" },
  { type: "order_waiting", permission: "orders", icon: Clock, tone: "red" },
  { type: "order_cancelled", permission: "orders", icon: Ban, tone: "gray" },
  { type: "new_message", permission: "inbox", icon: MessageSquare, tone: "blue" },
  { type: "new_custom", permission: "custom", icon: Gem, tone: "gold" },
  { type: "out_of_stock", permission: "products", icon: PackageX, tone: "red" },
  { type: "low_stock", permission: "products", icon: AlertTriangle, tone: "gold" },
  { type: "new_customer", permission: "customers", icon: UserPlus, tone: "green" },
  { type: "gold_price", permission: "pricing", icon: Coins, tone: "gold" },
];

export const kindOf = (type: NotificationType) => NOTIFICATION_KINDS.find((k) => k.type === type)!;
