/**
 * MOCK SITE PAGES (development only)
 * ------------------------------------------------------------------
 * The first time, mock-data/pages/*.json (the same pages as the storefront's samples) are copied into
 * .mock-db/db.json as published pages. After that everything is edited in Site pages:
 *   - editing saves a DRAFT (visitors don't see it)          -> saveDraft
 *   - "Publish" makes the draft live                         -> publishPage
 *   - the storefront (DASHBOARD_URL) reads publicPage / publicMenu
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type { AdminPage, ContentPage, LocalizedText, MenuPage, PageContent, PageMenu, PageSaveResult, PageSummary } from "@/types";
import { mutate, read } from "./mock-db";
import { SHOP_PAGES, SHOP_PAGE_TITLES, SYSTEM_PAGES } from "@/lib/pages/paths";
import { cleanForSite } from "@/lib/pages/content";
import about from "@/mock-data/pages/about.json";
import contact from "@/mock-data/pages/contact.json";
import faq from "@/mock-data/pages/faq.json";
import terms from "@/mock-data/pages/terms.json";
import returns from "@/mock-data/pages/returns.json";
import privacy from "@/mock-data/pages/privacy.json";
import customize from "@/mock-data/pages/customize.json";
import b2b from "@/mock-data/pages/b2b.json"; // King Gold: wholesale page

const SAMPLES = [about, contact, faq, terms, returns, privacy, customize, b2b] as unknown as (ContentPage & { menu?: PageMenu })[];

/** "Top of: All products / Categories" — empty and live from the start, so the client only has to add blocks */
const shopTop = (slug: string): AdminPage => {
  const now = new Date().toISOString();
  return { slug, menu: "none", system: true, published: { title: SHOP_PAGE_TITLES[slug], sections: [] }, publishedAt: now, draft: null, createdAt: now };
};

export function allPages(): AdminPage[] {
  const existing = read((db) => db.pages);
  if (existing) {
    // Added later than the first pages: create them once for stores that already have their pages saved
    const missing = Object.keys(SHOP_PAGES).filter((slug) => !existing.some((p) => p.slug === slug));
    if (!missing.length) return existing;
    return mutate((db) => {
      db.pages!.push(...missing.map(shopTop));
      return db.pages!;
    });
  }
  return mutate(
    (db) =>
      (db.pages ??= SAMPLES.map((p): AdminPage => ({
        slug: p.slug,
        menu: p.menu ?? "none",
        system: SYSTEM_PAGES.includes(p.slug),
        published: p.status === "published" ? { title: p.title, seo: p.seo, sections: p.sections as PageContent["sections"] } : null,
        publishedAt: p.updatedAt,
        draft: p.status === "published" ? null : { title: p.title, seo: p.seo, sections: p.sections as PageContent["sections"] },
        createdAt: p.updatedAt,
      })).concat(Object.keys(SHOP_PAGES).map(shopTop))),
  );
}

export const findPage = (slug: string) => allPages().find((p) => p.slug === slug) ?? null;

/** The version being edited: the draft if there is one, else the live one */
export const workingCopy = (p: AdminPage): PageContent => p.draft ?? p.published ?? { title: { ar: "", en: "" }, sections: [] };

export function toSummary(p: AdminPage): PageSummary {
  const w = workingCopy(p);
  const draftNewer = !!p.draft;
  return {
    slug: p.slug,
    title: w.title,
    menu: p.menu,
    system: p.system,
    status: !p.published ? "draft" : draftNewer ? "changed" : "published",
    sectionsCount: w.sections.length,
    updatedAt: (draftNewer ? p.draftSavedAt : p.publishedAt) ?? p.createdAt,
    updatedBy: draftNewer ? p.draftBy : p.publishedBy,
  };
}

/** System pages first (About, Contact, FAQ, Terms), then the others by creation date */
export function listPages(): PageSummary[] {
  // Order: About, Contact, FAQ, Terms · then the two "top of shop page" entries · then the client's own pages
  const rank = (p: AdminPage) => (p.slug in SHOP_PAGES ? 50 + Object.keys(SHOP_PAGES).indexOf(p.slug) : p.system ? SYSTEM_PAGES.indexOf(p.slug) : 100);
  return [...allPages()].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt)).map(toSummary);
}

function change(slug: string, fn: (p: AdminPage, pages: AdminPage[]) => PageSaveResult | void): PageSaveResult {
  return mutate((db) => {
    const pages = (db.pages ??= allPages());
    const page = pages.find((p) => p.slug === slug);
    if (!page) return { ok: false as const, error: "not_found" as const };
    return fn(page, pages) ?? { ok: true as const, page };
  });
}

export function createPage(input: { slug: string; title: LocalizedText; menu: PageMenu }, by: LocalizedText): PageSaveResult {
  return mutate((db) => {
    const pages = (db.pages ??= allPages());
    if (pages.some((p) => p.slug === input.slug)) return { ok: false as const, error: "slug_taken" as const };
    const now = new Date().toISOString();
    const page: AdminPage = {
      slug: input.slug,
      menu: input.menu,
      system: SYSTEM_PAGES.includes(input.slug),
      published: null,
      draft: {
        title: input.title,
        sections: [
          { id: "s_hero", type: "page_hero", isActive: true, sortOrder: 1, data: { title: input.title } },
          { id: "s_text", type: "rich_text", isActive: true, sortOrder: 2, data: { body: { ar: "<p>اكتب محتوى الصفحة هنا.</p>", en: "<p>Write the page content here.</p>" }, width: "narrow" } },
        ],
      },
      draftSavedAt: now,
      draftBy: by,
      createdAt: now,
    };
    pages.push(page);
    return { ok: true as const, page };
  });
}

export const saveDraft = (slug: string, content: PageContent, by: LocalizedText) =>
  change(slug, (p) => {
    p.draft = { ...content, sections: content.sections.map((s, i) => ({ ...s, sortOrder: i + 1 })) as PageContent["sections"] };
    p.draftSavedAt = new Date().toISOString();
    p.draftBy = by;
  });

export const publishPage = (slug: string, by: LocalizedText) =>
  change(slug, (p) => {
    if (!p.draft && p.published) return { ok: false, error: "nothing_to_publish" };
    p.published = p.draft ?? p.published;
    p.draft = null;
    p.publishedAt = new Date().toISOString();
    p.publishedBy = by;
  });

/** Throw away the unpublished changes (back to what's live) */
export const discardDraft = (slug: string) =>
  change(slug, (p) => {
    if (!p.published) return { ok: false, error: "nothing_to_publish" };
    p.draft = null;
  });

/** Take the page off the website (its content is kept as a draft) */
export const unpublishPage = (slug: string, by: LocalizedText) =>
  change(slug, (p) => {
    if (!p.published) return;
    p.draft = p.draft ?? p.published;
    p.published = null;
    p.draftSavedAt = new Date().toISOString();
    p.draftBy = by;
  });

/** Menu placement (applies right away) and, for custom pages, a new link */
export const updatePageSettings = (slug: string, settings: { menu: PageMenu; slug?: string }) =>
  change(slug, (p, pages) => {
    if (settings.slug && settings.slug !== p.slug) {
      if (p.system) return { ok: false, error: "system_page" };
      if (pages.some((x) => x.slug === settings.slug)) return { ok: false, error: "slug_taken" };
      p.slug = settings.slug;
    }
    p.menu = settings.menu;
  });

export function deletePage(slug: string): PageSaveResult {
  const page = findPage(slug);
  if (!page) return { ok: false, error: "not_found" };
  if (page.system) return { ok: false, error: "system_page" };
  mutate((db) => {
    db.pages = (db.pages ?? []).filter((p) => p.slug !== slug);
  });
  return { ok: true, page };
}

/* ---------- what the storefront reads ---------- */
function asContentPage(p: AdminPage, content: PageContent, isPreview: boolean): ContentPage {
  const clean = cleanForSite(content);
  return {
    slug: p.slug,
    status: "published",
    title: clean.title,
    seo: clean.seo,
    sections: clean.sections,
    updatedAt: (isPreview ? p.draftSavedAt : p.publishedAt) ?? p.createdAt,
    menu: p.menu,
    ...(isPreview ? { isPreview: true } : {}),
  };
}

/** Live page, or — with a valid preview token — the draft */
export function publicPage(slug: string, preview: boolean): ContentPage | null {
  const p = findPage(slug);
  if (!p) return null;
  if (preview) return asContentPage(p, workingCopy(p), true);
  return p.published ? asContentPage(p, p.published, false) : null;
}

export function publicMenu(): MenuPage[] {
  return listPages()
    .map((s, i) => ({ s, i }))
    // Every live page (not only the ones placed in a menu): the header can pick any of them (Header → Menu links)
    .filter(({ s }) => s.status !== "draft" && !(s.slug in SHOP_PAGES))
    .map(({ s, i }) => {
      const live = findPage(s.slug)!.published!;
      return { slug: s.slug, title: live.title, menu: s.menu, sortOrder: i };
    });
}
