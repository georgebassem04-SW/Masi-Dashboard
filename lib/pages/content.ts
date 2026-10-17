/**
 * PAGE & HOMEPAGE CONTENT CHECKS
 *   publishProblems(content) -> what must be filled before a page / the homepage can go live (both languages)
 *   cleanForSite(content)    -> removes empty optional texts ("" in both languages) so the website
 *                               doesn't draw empty subtitles / buttons
 * Used by the editor (to point at missing fields) and by the server when publishing.
 */
import type { CmsSection, LocalizedText } from "@/types";

/** A page ({ title, seo, sections }) or the homepage ({ sections } — no title) */
type Content = { title?: LocalizedText; sections: CmsSection[] };

export interface PublishProblem {
  /** Section id, or "page" for the page settings (title) */
  section: string;
  field: string;
}

const filled = (t?: LocalizedText) => !!t && !!t.ar?.trim() && !!t.en?.trim();
const blank = (t?: LocalizedText) => !t || (!t.ar?.trim() && !t.en?.trim());
/** Rich text counts as empty when it has no visible text and no image */
const filledHtml = (t?: LocalizedText) => !!t && [t.ar, t.en].every((h) => /<img/i.test(h ?? "") || (h ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0);

export function publishProblems(content: Content): PublishProblem[] {
  const out: PublishProblem[] = [];
  if ("title" in content && !filled(content.title)) out.push({ section: "page", field: "title" });
  for (const s of content.sections) {
    const need = (ok: boolean, field: string) => !ok && out.push({ section: s.id, field });
    switch (s.type) {
      case "page_hero":
        need(filled(s.data.title), "title");
        // a button with a text must have both languages and a link
        need([s.data.style?.showButton1 === false ? undefined : s.data.cta, s.data.style?.showButton2 === false ? undefined : s.data.cta2].every((b) => !b || blank(b.label) || (filled(b.label) && !!b.href.trim())), "buttons");
        break;
      case "rich_text":
        need(filledHtml(s.data.body), "body");
        break;
      case "image_text":
        need(filled(s.data.title), "title");
        need(filledHtml(s.data.body), "body");
        need(!!s.data.image?.url, "image");
        break;
      case "stats":
        need(s.data.items.length > 0 && s.data.items.every((i) => filled(i.value) && filled(i.label)), "items");
        break;
      case "features":
        need(filled(s.data.title), "title");
        need(s.data.items.length > 0 && s.data.items.every((i) => filled(i.title)), "items");
        break;
      case "timeline":
        need(filled(s.data.title), "title");
        need(s.data.items.length > 0 && s.data.items.every((i) => !!i.year.trim() && filled(i.title)), "items");
        break;
      case "faq":
        need(s.data.items.length > 0 && s.data.items.every((i) => filled(i.question) && filledHtml(i.answer)), "items");
        break;
      case "branches":
        need(filled(s.data.title), "title");
        break;
      case "cta":
        need(filled(s.data.title), "title");
        for (const key of ["primary", "secondary"] as const) {
          const b = s.data[key];
          if (b && !blank(b.label)) need(filled(b.label) && !!b.href.trim(), key);
        }
        need(s.data.background !== "image" || !!s.data.image?.url, "image");
        need(s.data.background !== "video" || !!s.data.video?.url?.trim(), "video");
        break;
      case "product_spotlight":
        need(filled(s.data.title), "title");
        need(!!s.data.image?.url, "image");
        if (s.data.source === "manual") need(!!s.data.productIds?.length, "products");
        if (s.data.source === "category") need(!!s.data.categoryId, "category");
        break;
      case "locations":
        need(filled(s.data.title), "title");
        need(!!s.data.image?.url, "image");
        need(s.data.items.every((i) => filled(i.title)), "items");
        break;
      case "social_feed":
        need(filled(s.data.title), "title");
        need(s.data.items.length > 0 && s.data.items.every((i) => !!i.image?.url), "items");
        break;
      case "contact":
        need(filled(s.data.title), "title");
        need(filled(s.data.successMessage), "successMessage");
        need(s.data.subjects.length > 0 && s.data.subjects.every((x) => filled(x.label) && !!x.value.trim()), "subjects");
        break;
      case "custom_order":
        need(filled(s.data.title), "title");
        need(filled(s.data.successMessage), "successMessage");
        need(s.data.steps.every(filled), "steps");
        break;
      /* ----- homepage blocks ----- */
      case "hero":
        // every slide needs a picture; the title is optional (picture only), but if written it needs both languages
        need(s.data.slides.length > 0 && s.data.slides.every((x) => !!x.image?.url && (x.style?.showTitle === false || blank(x.title) || filled(x.title))), "slides");
        // a button that is switched on and has a text must have both languages and a link
        need(s.data.slides.every((x) => [x.style?.showButton1 === false ? undefined : x.cta, x.style?.showButton2 === false ? undefined : x.cta2].every((b) => !b || blank(b.label) || (filled(b.label) && !!b.href.trim()))), "slides");
        break;
      case "banner":
        need(!!s.data.image?.url, "image");
        break;
      case "featured_products":
        need(filled(s.data.title), "title");
        if (s.data.source === "manual") need(!!s.data.productIds?.length, "products");
        if (s.data.source === "category") need(!!s.data.categoryId, "category");
        break;
      case "categories":
      case "brands":
      case "promotion":
        need(filled(s.data.title), "title");
        break;
      case "gold_prices":
        need(filled(s.data.title), "title");
        need(s.data.karats.length > 0, "karats");
        break;
      case "video":
        need(!!s.data.video?.url?.trim(), "video");
        break;
    }
  }
  return out;
}

/** Drops empty optional texts / buttons / images before the page is sent to the website */
export function cleanForSite<T extends Content>(content: T): T {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        // { ar: "", en: "" } -> removed
        if (v && typeof v === "object" && !Array.isArray(v) && "ar" in v && "en" in v && Object.keys(v).length === 2 && blank(v as LocalizedText)) continue;
        // a button without text, or an image without address -> removed
        if (v && typeof v === "object" && "label" in v && "href" in v && blank((v as { label: LocalizedText }).label)) continue;
        if (v && typeof v === "object" && "url" in v && !(v as { url: string }).url) continue;
        out[k] = clean(v);
      }
      return out;
    }
    return value;
  };
  return { ...content, sections: content.sections.map((s) => clean(s) as CmsSection) };
}
