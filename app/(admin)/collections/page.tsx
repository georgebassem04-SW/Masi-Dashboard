/**
 * PAGE: /collections — COLLECTIONS (Classic, Bridal, Italiano…)
 * List (drag to reorder) + the chosen collection's form. The chosen one is in the address: /collections?c=<id>
 * Everything happens in components/catalog/CollectionsManager.tsx. Data: api.listBrands().
 *   - Texts: dictionaries → "collections"
 *   - Where they show on the website: the "Collections" block of the homepage + the product filter
 * Needs permission "categories" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { CollectionsManager } from "@/components/catalog/CollectionsManager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.collections };
}

export default async function CollectionsPage({ searchParams }: PageProps<"/collections">) {
  const session = await requireStaff();
  if (!can(session, "categories")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const collections = await api.listBrands(session.token);
  const c = (await searchParams).c;
  const canEdit = can(session, "categories", "edit");
  const selectedId = typeof c === "string" && (c === "new" ? canEdit : collections.some((x) => x.id === c)) ? c : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <CollectionsManager
        collections={collections}
        selectedId={selectedId}
        canEdit={canEdit}
        locale={locale}
        storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
        labels={dict.collections}
        imageLabels={dict.theme.media}
        mediaLabels={dict.media}
      />
    </div>
  );
}
