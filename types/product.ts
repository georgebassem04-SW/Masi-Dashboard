/**
 * PRODUCT TYPES — the shape of a jewelry product, as the storefront expects it from the API.
 * Add a new product field here first (e.g. "gender"), then use it in the components.
 */
import type { LocalizedText, MediaImage, MediaVideo, Money } from "./common";
import type { HeroStyleInput } from "./cms";

export type Metal = "yellow_gold" | "white_gold" | "rose_gold" | "platinum" | "silver";

/** Gold purity. 24 = pure gold. */
export type Karat = 24 | 22 | 21 | 18 | 14;

/**
 * How the selling price is produced:
 * - "weight_based": price = weight × today's gold price for the karat + making charge + stones
 * - "fixed": the ERP sends a final price (e.g. diamond pieces, watches)
 */
export type PricingMode = "weight_based" | "fixed";

export interface MakingCharge {
  /** per_gram: value × weight | fixed: flat amount | percent: % of metal value */
  type: "per_gram" | "fixed" | "percent";
  value: number;
}

export interface Stone {
  type: "diamond" | "ruby" | "emerald" | "sapphire" | "pearl" | "zircon" | "other";
  count: number;
  /** total carat weight for this stone group */
  caratWeight?: number;
  color?: string;
  clarity?: string;
  price?: number;
}

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "made_to_order";

/** A sellable version of a product, e.g. ring size 16 weighing 4.2g. Each variant is a separate ERP item. */
export interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  length?: string;
  weightGrams: number;
  stockQty: number;
  stockStatus: StockStatus;
  /** Only for pricingMode = "fixed" */
  fixedPrice?: Money;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  brandId?: string;
  collectionId?: string;

  metal: Metal;
  karat: Karat;
  pricingMode: PricingMode;
  makingCharge: MakingCharge;
  stones: Stone[];

  images: MediaImage[];
  videos?: MediaVideo[];
  variants: ProductVariant[];

  tags: string[];
  isFeatured: boolean;
  isNew: boolean;
  certificate?: { issuer: string; number: string };
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  image?: MediaImage;
  /** Wide image at the top of the category page */
  banner?: MediaImage;
  /** Where the title and text sit on that banner, their colours, the shade (lib/hero-style.ts). Missing = the original design */
  bannerStyle?: HeroStyleInput;
  /** How tall the banner is (default "md") */
  bannerHeight?: "sm" | "md" | "lg";
  /** Short text under the category title */
  description?: LocalizedText;
  parentId?: string;
  sortOrder: number;
}

/** A collection (Classic, Bridal…). Edited in the dashboard → Collections */
export interface Brand {
  id: string;
  slug: string;
  name: LocalizedText;
  /** The collection's picture on the homepage block (none = a plain box with the name) */
  logo?: MediaImage;
  /** Position on the website (small first) */
  sortOrder?: number;
}

/** Live gold price per gram, pushed by the ERP/dashboard (usually several times a day). */
export interface GoldPrice {
  karat: Karat;
  pricePerGram: number;
  currency: string;
  updatedAt: string;
}

export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  metal?: Metal[];
  karat?: Karat[];
  minPrice?: number;
  maxPrice?: number;
  minWeight?: number;
  maxWeight?: number;
  inStockOnly?: boolean;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "weight_asc" | "weight_desc";
  page?: number;
  pageSize?: number;
}
