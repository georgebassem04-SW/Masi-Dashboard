/**
 * PRODUCT & CATEGORY FORM RULES (Zod) — checked in the API routes before anything is saved.
 * Error codes (e.g. "required") are turned into Arabic / English text by the forms (dictionaries → "products.errors").
 */
import { z } from "zod";
import { heroStyle } from "./pages";
import { SLUG_RE } from "@/lib/catalog/helpers";

const text = (max: number) => z.string().trim().max(max);
const localized = (max: number, required = true) =>
  z.object({ ar: required ? text(max).min(1, "required") : text(max), en: required ? text(max).min(1, "required") : text(max) });
const slug = z.string().trim().min(1, "required").max(80).regex(SLUG_RE, "invalidSlug");
const money = z.number().finite().min(0).max(100_000_000);
const image = z.object({
  url: z.string().trim().min(1).max(600).refine((u) => u.startsWith("/") || /^https?:\/\//.test(u), "invalidUrl"),
  alt: localized(200, false).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const productSchema = z.object({
  name: localized(150),
  description: localized(4000, false),
  categoryId: z.string().min(1, "required"),
  // Collection (dashboard → Collections). Empty = no collection
  brandId: z.string().max(60).optional(),
  slug,
  sku: z.string().trim().min(1, "required").max(60),
  metal: z.enum(["yellow_gold", "white_gold", "rose_gold", "platinum", "silver"]),
  karat: z.union([z.literal(24), z.literal(22), z.literal(21), z.literal(18), z.literal(14)]),
  pricingMode: z.enum(["weight_based", "fixed"]),
  makingCharge: z.object({ type: z.enum(["per_gram", "fixed", "percent"]), value: money }),
  stones: z
    .array(
      z.object({
        type: z.enum(["diamond", "ruby", "emerald", "sapphire", "pearl", "zircon", "other"]),
        count: z.number().int().min(1).max(10_000),
        caratWeight: z.number().min(0).max(1000).optional(),
        color: text(20).optional(),
        clarity: text(20).optional(),
        price: money.optional(),
      }),
    )
    .max(20),
  images: z.array(image).max(20),
  tags: z.array(text(40).min(1)).max(30),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  visible: z.boolean(),
  certificate: z.object({ issuer: text(80).min(1, "required"), number: text(80).min(1, "required") }).optional(),
  variants: z
    .array(
      z.object({
        id: z.string().max(60),
        sku: z.string().trim().min(1, "required").max(60),
        size: text(20).optional(),
        length: text(20).optional(),
        weightGrams: z.number().positive("required").max(100_000),
        stockQty: z.number().int().min(0).max(1_000_000),
        stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock", "made_to_order"]),
        fixedPrice: z.object({ amount: money, currency: z.string().length(3) }).optional(),
      }),
    )
    .min(1, "required")
    .max(50),
});

export const categorySchema = z.object({
  name: localized(80),
  slug,
  description: localized(500, false).optional(),
  parentId: z.string().max(60).optional(),
  image: image.optional(),
  banner: image.optional(),
  // Banner layout (same options as a page title banner)
  bannerStyle: heroStyle.optional(),
  bannerHeight: z.enum(["sm", "md", "lg"]).optional(),
  visible: z.boolean(),
});

/** Collection form (dashboard → Collections) */
export const brandSchema = z.object({
  name: localized(80),
  slug,
  logo: image.optional(),
  visible: z.boolean(),
});

export const reorderSchema = z.object({ ids: z.array(z.string().max(60)).min(1).max(500) });
