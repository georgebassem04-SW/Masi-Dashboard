/**
 * SITE PAGE & HOMEPAGE RULES (Zod) — checked by the API routes before a page / the homepage is saved.
 * Shapes only (texts may be empty while editing a draft); "is everything filled?" is checked
 * when publishing (lib/pages/content.ts → publishProblems).
 * HTML texts are cleaned again by the storefront before display (storefront: components/common/RichText.tsx).
 */
import { z } from "zod";
import { SLUG_RE } from "@/lib/catalog/helpers";

const text = (max: number) => z.object({ ar: z.string().max(max), en: z.string().max(max) });
const html = text(20_000);
const image = z.object({
  url: z.string().max(600),
  alt: text(200).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
// A button's address: a site path, "#…", http(s), tel: or mailto: — nothing else (never "javascript:")
const link = z.object({ label: text(60), href: z.string().max(300).refine((h) => h === "" || (h.startsWith("/") && !h.startsWith("//")) || h.startsWith("#") || /^(https?:\/\/|mailto:|tel:)/i.test(h), "invalidLink") });
const base = {
  id: z.string().min(1).max(40),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(1000),
};

/* ----- hero layout (lib/hero-style.ts): every value optional — missing = the original design ----- */
const hexOrAuto = z.string().regex(/^(#[0-9a-fA-F]{6})?$/);
const heroButton = z.object({ variant: z.enum(["filled", "outline"]), color: hexOrAuto, textColor: hexOrAuto }).partial();
/** Also used for the banner of a category (lib/validation/catalog.ts) */
export const heroStyle = z
  .object({
    showTitle: z.boolean(),
    showText: z.boolean(),
    showButton1: z.boolean(),
    showButton2: z.boolean(),
    x: z.enum(["start", "center", "end"]),
    y: z.enum(["top", "middle", "bottom"]),
    buttons: z.enum(["text", "own"]),
    bx: z.enum(["start", "center", "end"]),
    by: z.enum(["top", "middle", "bottom"]),
    titleSize: z.enum(["sm", "md", "lg"]),
    titleColor: hexOrAuto,
    textColor: hexOrAuto,
    overlay: z.number().min(0).max(80),
    overlayColor: hexOrAuto,
    blur: z.number().min(0).max(20).optional(),
    button1: heroButton,
    button2: heroButton,
  })
  .partial();

/** Big pictures: the slider and the wide banner — on the homepage AND on any page */
const pictures = [
  z.object({
    ...base,
    type: z.literal("hero"),
    data: z.object({
      height: z.enum(["md", "lg", "full"]).optional(),
      look: z.enum(["classic", "editorial"]).optional(),
      slides: z
        .array(
          z.object({
            image,
            mobileImage: image.optional(),
            title: text(150),
            subtitle: text(300).optional(),
            cta: link.optional(),
            cta2: link.optional(),
            style: heroStyle.optional(),
          }),
        )
        .max(8),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("banner"),
    data: z.object({
      image,
      title: text(150).optional(),
      cta: link.optional(),
    }),
  }),
] as const;

const pageHero = z.object({
  ...base,
  type: z.literal("page_hero"),
  data: z.object({
    title: text(150),
    subtitle: text(300).optional(),
    image: image.optional(),
    cta: link.optional(),
    cta2: link.optional(),
    height: z.enum(["sm", "md", "lg"]).optional(),
    breadcrumb: z.boolean().optional(),
    background: hexOrAuto.optional(),
    style: heroStyle.optional(),
  }),
});

/** Blocks that can go on a page AND on the homepage */
const shared = [
  z.object({
    ...base,
    type: z.literal("rich_text"),
    data: z.object({
      title: text(150).optional(),
      body: html,
      width: z.enum(["narrow", "wide"]),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("image_text"),
    data: z.object({
      eyebrow: text(80).optional(),
      title: text(150),
      body: html,
      image,
      imagePosition: z.enum(["start", "end"]),
      cta: link.optional(),
      layout: z.enum(["card", "split", "editorial"]).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("stats"),
    data: z.object({
      title: text(150).optional(),
      items: z.array(z.object({ value: text(20), label: text(80) })).max(8),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("features"),
    data: z.object({
      title: text(150),
      subtitle: text(300).optional(),
      columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
      items: z
        .array(
          z.object({
            icon: z.enum(["gem", "shield", "scale", "sparkles", "award", "heart", "truck", "coins", "wrench", "badge"]),
            title: text(80),
            text: text(400),
          }),
        )
        .max(12),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("timeline"),
    data: z.object({
      title: text(150),
      items: z
        .array(
          z.object({
            year: z.string().max(12),
            title: text(100),
            text: text(500),
          }),
        )
        .max(30),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("faq"),
    data: z.object({
      title: text(150).optional(),
      items: z.array(z.object({ question: text(300), answer: html })).max(60),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("branches"),
    data: z.object({
      title: text(150),
      subtitle: text(300).optional(),
      branchIds: z.array(z.string().max(40)).max(50).optional(),
      align: z.enum(["start", "center", "end"]).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("cta"),
    data: z.object({
      title: text(150),
      text: text(400).optional(),
      primary: link.optional(),
      secondary: link.optional(),
      background: z.enum(["primary", "secondary", "image", "video"]),
      image: image.optional(),
      video: z.object({ url: z.string().max(600), posterUrl: z.string().max(600).optional(), provider: z.literal("file") }).optional(),
      eyebrow: text(80).optional(),
      align: z.enum(["start", "center"]).optional(),
      height: z.enum(["sm", "md", "lg"]).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("social_feed"),
    data: z.object({
      title: text(150),
      subtitle: text(300).optional(),
      handle: z.string().max(60),
      profileUrl: z.string().max(300).refine((h) => h === "" || /^https?:\/\//i.test(h), "invalidLink"),
      items: z.array(z.object({ image, href: z.string().max(300).refine((h) => h === "" || /^https?:\/\//i.test(h), "invalidLink").optional() })).max(16),
      button: link.optional(),
      look: z.enum(["posts", "gallery"]).optional(),
    }),
  }),
  // Big picture with words + a few product cards ("Signature *Pieces*")
  z.object({
    ...base,
    type: z.literal("product_spotlight"),
    data: z.object({
      eyebrow: text(80).optional(),
      title: text(150),
      text: text(400).optional(),
      cta: link.optional(),
      image,
      imagePosition: z.enum(["start", "end"]),
      source: z.enum(["manual", "category", "featured", "new"]),
      productIds: z.array(z.string().max(60)).max(4).optional(),
      categoryId: z.string().max(60).optional(),
      limit: z.union([z.literal(2), z.literal(4)]),
    }),
  }),
  // Wide picture with places along the bottom ("Visit us *in Cairo*")
  z.object({
    ...base,
    type: z.literal("locations"),
    data: z.object({
      eyebrow: text(80).optional(),
      title: text(150),
      image,
      items: z.array(z.object({ title: text(80), text: text(200).optional(), link: link.optional() })).max(4),
      height: z.enum(["md", "lg"]).optional(),
      overlay: z.number().min(0).max(80).optional(),
    }),
  }),
] as const;

const contact = z.object({
  ...base,
  type: z.literal("contact"),
  data: z.object({
    title: text(150),
    subtitle: text(300).optional(),
    subjects: z
      .array(
        z.object({
          value: z
            .string()
            .max(40)
            .regex(/^[a-z0-9_-]*$/),
          label: text(80),
        }),
      )
      .max(20),
    successMessage: text(300),
    showContactInfo: z.boolean(),
    showBranchSelect: z.boolean(),
  }),
});

const customOrder = z.object({
  ...base,
  type: z.literal("custom_order"),
  data: z.object({
    title: text(150),
    subtitle: text(300).optional(),
    steps: z.array(text(120)).max(6),
    successMessage: text(300),
    showKarat: z.boolean(),
    showBudget: z.boolean(),
  }),
});

export const sectionSchema = z.discriminatedUnion("type", [pageHero, ...pictures, ...shared, contact, customOrder]);

/* ----- homepage-only blocks ----- */
const video = z.object({
  url: z.string().max(600),
  posterUrl: z.string().max(600).optional(),
  provider: z.enum(["file", "youtube", "vimeo"]),
});
const homeOnly = [
  z.object({
    ...base,
    type: z.literal("featured_products"),
    data: z.object({
      title: text(150),
      source: z.enum(["featured", "new", "manual", "category"]),
      productIds: z.array(z.string().max(60)).max(24).optional(),
      categoryId: z.string().max(60).optional(),
      limit: z.number().int().min(1).max(24),
      layout: z.enum(["grid", "carousel"]).optional(),
      titleStyle: z.enum(["classic", "centered"]).optional(),
      tabs: z.array(z.object({ label: text(40), categoryId: z.string().max(60).optional(), tag: z.string().max(40).optional() })).max(8).optional(),
      allLabel: text(40).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("categories"),
    data: z.object({
      title: text(150),
      eyebrow: text(80).optional(),
      categoryIds: z.array(z.string().max(60)).max(40).optional(),
      align: z.enum(["start", "center", "end"]).optional(),
      titleAlign: z.enum(["start", "center", "end"]).optional(),
      style: z.enum(["circles", "tiles"]).optional(),
      fullWidth: z.boolean().optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("brands"),
    data: z.object({
      title: text(150),
      brandIds: z.array(z.string().max(60)).max(40).optional(),
      align: z.enum(["start", "center", "end"]).optional(),
      titleAlign: z.enum(["start", "center", "end"]).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("video"),
    data: z.object({ title: text(150).optional(), video }),
  }),
  z.object({
    ...base,
    type: z.literal("promotion"),
    data: z.object({
      title: text(150),
      description: text(400).optional(),
      image: image.optional(),
      cta: link.optional(),
      endsAt: z.string().datetime({ offset: true }).optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("gold_prices"),
    data: z.object({
      title: text(150),
      karats: z.array(z.union([z.literal(24), z.literal(22), z.literal(21), z.literal(18), z.literal(14)])).max(5),
    }),
  }),
] as const;

export const homeContentSchema = z.object({
  sections: z.array(z.discriminatedUnion("type", [...pictures, ...homeOnly, ...shared])).max(40),
});

export const pageContentSchema = z.object({
  title: text(150),
  seo: z
    .object({
      title: text(150).optional(),
      description: text(300).optional(),
      image: image.optional(),
    })
    .optional(),
  sections: z.array(sectionSchema).max(40),
});

export const newPageSchema = z.object({
  slug: z.string().trim().min(1, "required").max(60).regex(SLUG_RE, "invalidSlug"),
  title: z.object({
    ar: z.string().trim().min(1, "required").max(150),
    en: z.string().trim().min(1, "required").max(150),
  }),
  menu: z.enum(["header", "footer", "none"]),
});

export const pageSettingsSchema = z.object({
  menu: z.enum(["header", "footer", "none"]),
  /** New link (custom pages only) */
  slug: z.string().trim().min(1).max(60).regex(SLUG_RE, "invalidSlug").optional(),
});
