/**
 * GOLD PRICE CALCULATION — the SAME formula as the storefront (storefront: lib/pricing.ts).
 * If you change one, change the other, or the dashboard preview and the website will disagree.
 *
 *   weight_based products:  weight (g) × gold price per gram for that karat
 *                           + making charge + stones
 *   fixed products:         the price sent by the ERP
 *
 * Making charge types (set per product in the product form → "Gold & pricing"):
 *   "per_gram" : value × weight
 *   "percent"  : value % of the gold value
 *   "fixed"    : a flat amount
 *
 * This is for DISPLAY only. At checkout the API must confirm the final price,
 * because the gold rate can change while the customer is shopping.
 */
import type { GoldPrice, Product, ProductVariant } from "@/types";

export interface PriceBreakdown {
  metalValue: number;
  makingCharge: number;
  stones: number;
  total: number;
}

/**
 * Jewelry price calculation.
 * weight_based: (weight × gold price per gram for the karat) + making charge + stones
 * fixed:        the price sent by the ERP
 *
 * NOTE: this is for DISPLAY only. The final price must be confirmed by the API at checkout,
 * because the gold rate can change between browsing and ordering.
 */
export function calculatePrice(
  product: Product,
  variant: ProductVariant,
  goldPrices: GoldPrice[],
): PriceBreakdown {
  const stones = product.stones.reduce((sum, s) => sum + (s.price ?? 0), 0);

  if (product.pricingMode === "fixed") {
    const total = variant.fixedPrice?.amount ?? 0;
    return { metalValue: total - stones, makingCharge: 0, stones, total };
  }

  const rate = goldPrices.find((g) => g.karat === product.karat)?.pricePerGram ?? 0;
  const metalValue = variant.weightGrams * rate;

  const mc = product.makingCharge;
  const makingCharge =
    mc.type === "per_gram"
      ? mc.value * variant.weightGrams
      : mc.type === "percent"
        ? (metalValue * mc.value) / 100
        : mc.value;

  const total = Math.round(metalValue + makingCharge + stones);
  return { metalValue, makingCharge, stones, total };
}

/** Lowest price among the product's variants (used on product cards: "from ...") */
export function startingPrice(product: Product, goldPrices: GoldPrice[]): number {
  const prices = product.variants.map((v) => calculatePrice(product, v, goldPrices).total);
  return prices.length ? Math.min(...prices) : 0;
}
