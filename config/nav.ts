/**
 * SIDEBAR MENU — every section of the dashboard, in order.
 * ------------------------------------------------------------------
 *   key        -> text in lib/i18n/dictionaries/*.json → "nav"
 *   href       -> page address (the page file is app/(admin)/<href>/page.tsx)
 *   group      -> heading it sits under (text in dictionaries → "navGroups")
 *   permission -> section hidden for staff without at least "view" on it (lib/auth/permissions.ts)
 *   icon       -> any icon from https://lucide.dev/icons
 *   ready      -> false = page shows "under development" (built in a later step)
 *
 * To add a section: add a line here, a text in ar.json + en.json, and create its page file.
 */
import {
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  FolderTree,
  PackageSearch,
  Layers,
  Gem,
  Home,
  ImageIcon,
  LayoutDashboard,
  Palette,
  PanelBottom,
  PanelTop,
  MessageSquare,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PermissionKey } from "@/lib/auth/permissions";

export type NavGroup = "sales" | "catalog" | "content" | "site";

export interface NavItem {
  key: string;
  href: string;
  group: NavGroup;
  icon: LucideIcon;
  /** null = everyone can see it */
  permission: PermissionKey | null;
  ready: boolean;
}

export const NAV_GROUPS: NavGroup[] = ["sales", "catalog", "content", "site"];

export const NAV_ITEMS: NavItem[] = [
  // ===== SALES =====
  { key: "overview", href: "/", group: "sales", icon: LayoutDashboard, permission: null, ready: true },
  { key: "orders", href: "/orders", group: "sales", icon: ShoppingBag, permission: "orders", ready: true },
  { key: "customers", href: "/customers", group: "sales", icon: Users, permission: "customers", ready: true },
  { key: "inbox", href: "/inbox", group: "sales", icon: MessageSquare, permission: "inbox", ready: true },
  { key: "custom", href: "/custom-requests", group: "sales", icon: Gem, permission: "custom", ready: true },
  { key: "reports", href: "/reports", group: "sales", icon: BarChart3, permission: "reports", ready: true },
  // ===== CATALOG =====
  { key: "products", href: "/products", group: "catalog", icon: Boxes, permission: "products", ready: true },
  { key: "categories", href: "/categories", group: "catalog", icon: FolderTree, permission: "categories", ready: true },
  // Collections (Classic, Bridal…): the "Our collections" homepage block + the product filter (same permission as Categories)
  { key: "collections", href: "/collections", group: "catalog", icon: Layers, permission: "categories", ready: true },
  // ===== CONTENT =====
  { key: "pages", href: "/pages", group: "content", icon: FileText, permission: "content", ready: true },
  { key: "media", href: "/media", group: "content", icon: ImageIcon, permission: "content", ready: true },
  // ===== WEBSITE =====
  { key: "theme", href: "/theme", group: "site", icon: Palette, permission: "theme", ready: true },
  // Top bar and footer of the website (same theme + permission as Theme & design)
  { key: "header", href: "/header", group: "site", icon: PanelTop, permission: "theme", ready: true },
  { key: "footer", href: "/footer", group: "site", icon: PanelBottom, permission: "theme", ready: true },
  // Filter column of the product pages: which sections and categories show (same theme + permission)
  { key: "filters", href: "/filters", group: "site", icon: SlidersHorizontal, permission: "theme", ready: true },
  // A product's own page: which parts show (buy now, WhatsApp, price breakdown…), photo side, main button
  { key: "productPage", href: "/product-page", group: "site", icon: PackageSearch, permission: "theme", ready: true },
  { key: "homeBuilder", href: "/home-builder", group: "site", icon: Home, permission: "content", ready: true },
  { key: "pricing", href: "/pricing", group: "site", icon: Tag, permission: "pricing", ready: true },
  { key: "checkout", href: "/checkout", group: "site", icon: CreditCard, permission: "checkout", ready: true },
  // Everyone sees Settings (at least "My account"); the tabs inside follow the "settings" and "staff" permissions
  { key: "settings", href: "/settings", group: "site", icon: Settings, permission: null, ready: true },
];


export const findNavItem = (key: string) => NAV_ITEMS.find((i) => i.key === key);
