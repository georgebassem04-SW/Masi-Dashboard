/**
 * MOCK HOMEPAGE (development only)
 * ------------------------------------------------------------------
 * The first time, mock-data/home.json (the same blocks as the storefront's sample) becomes the live homepage.
 * After that everything is edited in Homepage (/home-builder):
 *   - editing saves a DRAFT (visitors don't see it)   -> saveHomeDraft
 *   - "Publish" makes the draft live                  -> publishHome
 *   - the storefront (DASHBOARD_URL) reads publicHome
 * The collections the "Our collections" block can choose from: dashboard → Collections (lib/api/mock-catalog.ts).
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type { AdminHome, HomeContent, HomePage, HomeSaveResult, HomeSection, LocalizedText } from "@/types";
import { mutate, read } from "./mock-db";
import { cleanForSite } from "@/lib/pages/content";
import homeJson from "@/mock-data/home.json";

export function getHome(): AdminHome {
  const existing = read((db) => db.home);
  if (existing) return existing;
  return mutate((db) => (db.home ??= { published: { sections: (homeJson as { sections: HomeSection[] }).sections }, publishedAt: new Date().toISOString(), draft: null }));
}

const numbered = (c: HomeContent): HomeContent => ({ sections: c.sections.map((s, i) => ({ ...s, sortOrder: i + 1 })) });

export function saveHomeDraft(content: HomeContent, by: LocalizedText): HomeSaveResult {
  getHome();
  const home = mutate((db) => {
    const h = db.home!;
    h.draft = numbered(content);
    h.draftSavedAt = new Date().toISOString();
    h.draftBy = by;
    return h;
  });
  return { ok: true, home };
}

export function publishHome(by: LocalizedText): HomeSaveResult {
  getHome();
  return mutate((db) => {
    const h = db.home!;
    if (!h.draft) return { ok: false as const, error: "nothing_to_publish" as const };
    h.published = h.draft;
    h.draft = null;
    h.publishedAt = new Date().toISOString();
    h.publishedBy = by;
    return { ok: true as const, home: h };
  });
}

/** Throw away the unpublished changes (back to what's live) */
export function discardHomeDraft(): HomeSaveResult {
  getHome();
  return mutate((db) => {
    const h = db.home!;
    if (!h.draft) return { ok: false as const, error: "nothing_to_publish" as const };
    h.draft = null;
    return { ok: true as const, home: h };
  });
}

/** What the storefront draws: the live homepage, or — with a valid preview token — the draft */
export function publicHome(preview: boolean): HomePage {
  const h = getHome();
  const content = preview ? (h.draft ?? h.published) : h.published;
  return { sections: cleanForSite(content).sections, ...(preview ? { isPreview: true } : {}) };
}
