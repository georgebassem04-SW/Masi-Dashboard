/**
 * GOLD PRICE & COUPON RULES (Zod) — checked in the API routes before saving.
 * Error codes are turned into text by the page (dictionaries → "pricing.errors").
 */
import { z } from "zod";

export const pricingSettingsSchema = z.object({
  source: z.enum(["erp", "manual"]),
  priceLockMinutes: z.number().int().min(1, "lockRange").max(120, "lockRange"),
  priceChangeTolerancePct: z.number().min(0, "toleranceRange").max(5, "toleranceRange"),
});

export const goldPricesSchema = z.object({
  prices: z
    .array(
      z.object({
        karat: z.union([z.literal(24), z.literal(22), z.literal(21), z.literal(18), z.literal(14)]),
        pricePerGram: z.number().positive("required").max(10_000_000),
      }),
    )
    .min(1)
    .max(5),
});

const iso = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "invalidDate");

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "codeFormat")
      .max(30, "codeFormat")
      .regex(/^[A-Z0-9_-]+$/, "codeFormat"),
    type: z.enum(["percent", "amount", "free_shipping"]),
    value: z.number().min(0).max(100_000_000),
    appliesTo: z.enum(["making_charge", "subtotal"]),
    minSubtotal: z.number().min(0).max(100_000_000),
    maxDiscount: z.number().positive().max(100_000_000).optional(),
    label: z.object({ ar: z.string().trim().min(1, "required").max(120), en: z.string().trim().min(1, "required").max(120) }),
    isActive: z.boolean(),
    startsAt: iso.optional(),
    endsAt: iso.optional(),
    usageLimit: z.number().int().positive().max(1_000_000).optional(),
    // Only these products (ids). Empty = every product
    productIds: z.array(z.string().trim().min(1).max(100)).max(500).optional(),
    // true = special offer shown on the product itself, no code to type
    automatic: z.boolean().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.type === "percent" && (c.value <= 0 || c.value > 100)) ctx.addIssue({ code: "custom", path: ["value"], message: "percentRange" });
    if (c.type === "amount" && c.value <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "required" });
    // A special offer lowers a product's price, so it can't be "free delivery"
    if (c.automatic && c.type === "free_shipping") ctx.addIssue({ code: "custom", path: ["type"], message: "offerNoShipping" });
    if (c.startsAt && c.endsAt && Date.parse(c.endsAt) <= Date.parse(c.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "endBeforeStart" });
  });
