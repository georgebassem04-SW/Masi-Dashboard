/**
 * SHIPPING & PAYMENT RULES (Zod) — checked by PUT /api/checkout-settings before saving.
 * Error codes are turned into text by the page (dictionaries → "checkoutSettings.errors").
 */
import { z } from "zod";

const text = (max: number) => z.object({ ar: z.string().trim().min(1, "required").max(max), en: z.string().trim().min(1, "required").max(max) });
const optionalText = (max: number) => z.object({ ar: z.string().trim().max(max), en: z.string().trim().max(max) }).optional();
const money = z.number().min(0).max(100_000_000);

export const checkoutSettingsSchema = z
  .object({
    shippingZones: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
          name: text(60),
          fee: money,
          freeOver: money.optional(),
          deliveryTime: text(40),
          isActive: z.boolean(),
        }),
      )
      .max(60),
    paymentMethods: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
          type: z.enum(["cash_on_delivery", "card", "bank_transfer", "pay_in_store"]),
          label: text(60),
          description: optionalText(200),
          instructions: optionalText(1000),
          maxOrderTotal: money.optional(),
          availableFor: z.array(z.enum(["delivery", "store_pickup"])).min(1, "chooseOne"),
          isActive: z.boolean(),
        }),
      )
      .min(1)
      .max(10),
    vatBase: z.enum(["total", "making_charge", "none"]),
    vatPercent: z.number().min(0, "vatRange").max(100, "vatRange"),
    minOrderTotal: money.optional(),
    termsUrl: z.string().trim().max(200),
    storePickup: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const ids = s.shippingZones.map((z) => z.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["shippingZones"], message: "duplicate" });
  });
