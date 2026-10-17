/**
 * MOCK BRANCHES & STORE DETAILS (development only)
 * ------------------------------------------------------------------
 * First time: mock-data/branches.json and mock-data/store.json are copied into .mock-db/db.json.
 * After that they're edited in Settings → Branches / Store details, and the storefront (DASHBOARD_URL)
 * reads them through /api/public/branches and /api/public/store.
 * With the real API (DATA_SOURCE=http) none of this is used.
 */
import "server-only";
import type { Branch, BranchInput, BranchSaveResult, StoreSettings } from "@/types";
import { slugify } from "@/lib/catalog/helpers";
import { mutate, read } from "./mock-db";
import branchesJson from "@/mock-data/branches.json";
import storeJson from "@/mock-data/store.json";

function all(): Branch[] {
  const existing = read((db) => db.branches);
  if (existing) return existing;
  return mutate((db) => (db.branches ??= structuredClone(branchesJson as unknown as Branch[])));
}

export const listBranches = (): Branch[] => [...all()].sort((a, b) => a.sortOrder - b.sortOrder);

/** Optional fields left empty are removed, so the website doesn't show empty lines */
const tidy = (b: BranchInput): BranchInput => ({
  ...b,
  whatsapp: b.whatsapp?.trim() || undefined,
  mapUrl: b.mapUrl?.trim() || undefined,
  image: b.image?.url ? b.image : undefined,
});

export function createBranch(input: BranchInput): BranchSaveResult {
  return mutate((db) => {
    const list = (db.branches ??= all());
    const base = `br-${slugify(input.name.en).slice(0, 30) || "branch"}`;
    let id = base;
    for (let n = 2; list.some((b) => b.id === id); n++) id = `${base}-${n}`;
    const branch: Branch = { ...tidy(input), id, sortOrder: Math.max(0, ...list.map((b) => b.sortOrder)) + 1 };
    list.push(branch);
    return { ok: true as const, branch };
  });
}

export function updateBranch(id: string, input: BranchInput): BranchSaveResult {
  return mutate((db) => {
    const list = (db.branches ??= all());
    const i = list.findIndex((b) => b.id === id);
    if (i < 0) return { ok: false as const, error: "not_found" as const };
    list[i] = { ...tidy(input), id, sortOrder: list[i].sortOrder };
    return { ok: true as const, branch: list[i] };
  });
}

/** Past orders keep the branch id; they just can't show its name any more */
export function deleteBranch(id: string): BranchSaveResult {
  return mutate((db) => {
    const list = (db.branches ??= all());
    const b = list.find((x) => x.id === id);
    if (!b) return { ok: false as const, error: "not_found" as const };
    db.branches = list.filter((x) => x.id !== id);
    return { ok: true as const, branch: b };
  });
}

export function reorderBranches(ids: string[]): Branch[] {
  return mutate((db) => {
    const list = (db.branches ??= all());
    ids.forEach((id, i) => {
      const b = list.find((x) => x.id === id);
      if (b) b.sortOrder = i + 1;
    });
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  });
}

export function getStore(): StoreSettings {
  const existing = read((db) => db.store);
  if (existing) return existing;
  return mutate((db) => (db.store ??= structuredClone(storeJson as StoreSettings)));
}

export function saveStore(settings: StoreSettings): StoreSettings {
  // Empty social links are dropped (no icon on the website)
  const social = Object.fromEntries(Object.entries(settings.social).filter(([, v]) => v && v.trim())) as StoreSettings["social"];
  return mutate((db) => (db.store = { ...settings, social }));
}
