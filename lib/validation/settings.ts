/**
 * SETTINGS RULES (Zod) — staff, passwords, store details, branches. Checked by the API routes before saving.
 * Error codes are turned into text by the pages (dictionaries → "settings.errors").
 */
import { z } from "zod";
import { PERMISSION_KEYS } from "@/lib/auth/permissions";
import { passwordProblem } from "@/lib/staff/rules";

const required = (max: number) => z.string().trim().min(1, "required").max(max);
const text = (max: number) => z.object({ ar: required(max), en: required(max) });
const optionalText = (max: number) => z.object({ ar: z.string().trim().max(max), en: z.string().trim().max(max) });
const level = z.enum(["none", "view", "edit"]);
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d\s()-]*$/, "phoneInvalid");
const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "urlInvalid");

export const password = z.string().max(128).superRefine((p, ctx) => {
  const problem = passwordProblem(p);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

export const staffInputSchema = z.object({
  name: text(60),
  email: z.email("emailInvalid").max(200).transform((e) => e.trim().toLowerCase()),
  role: z.enum(["owner", "manager", "orders", "content", "designer", "viewer"]),
  /** null = simple mode (the role's ready-made permissions) */
  permissions: z.object(Object.fromEntries(PERMISSION_KEYS.map((k) => [k, level])) as Record<(typeof PERMISSION_KEYS)[number], typeof level>).nullable(),
  active: z.boolean(),
});

export const newStaffSchema = staffInputSchema.extend({ password });

/** The owner gives someone a new temporary password */
export const resetPasswordSchema = z.object({ password });

/** Anyone changes their own password */
export const changePasswordSchema = z
  .object({ current: z.string().min(1, "required").max(200), next: password })
  .refine((v) => v.current !== v.next, { path: ["next"], message: "samePassword" });

export const storeSettingsSchema = z.object({
  contact: z.object({
    email: z.email("emailInvalid").max(200),
    phone: phone.min(1, "required"),
    whatsapp: phone,
    address: optionalText(200),
    hours: optionalText(120),
  }),
  social: z.object({ instagram: url, facebook: url, tiktok: url, x: url, youtube: url, snapchat: url }).partial(),
  options: z.object({ guestCheckout: z.boolean(), showWeight: z.boolean(), showGoldPrices: z.boolean() }),
  /** Empty = no copy of new orders */
  ordersNotifyEmail: z.union([z.literal(""), z.email("emailInvalid").max(200)]),
});

export const branchSchema = z.object({
  name: text(80),
  city: text(60),
  address: text(200),
  phone: phone.min(1, "required"),
  whatsapp: phone.optional(),
  hours: text(120),
  mapUrl: url.optional(),
  image: z.object({ url: z.string().max(600) }).optional(),
  isPickupPoint: z.boolean(),
});

export const branchOrderSchema = z.object({ ids: z.array(z.string().max(60)).max(100) });
