/**
 * PAGE: /categories — CATEGORIES (design screen 7)
 * List (drag to reorder) + the chosen category's form. The chosen one is in the address: /categories?c=<id>
 * Everything happens in components/catalog/CategoriesManager.tsx. Data: api.listCategories().
 *   - Texts: dictionaries → "categories"
 * Needs permission "categories" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { CategoriesManager } from "@/components/catalog/CategoriesManager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.categories };
}

export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const session = await requireStaff();
  if (!can(session, "categories")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const categories = await api.listCategories(session.token);
  const c = (await searchParams).c;
  const canEdit = can(session, "categories", "edit");
  const selectedId = typeof c === "string" && (c === "new" ? canEdit : categories.some((x) => x.id === c)) ? c : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <CategoriesManager
        categories={categories}
        selectedId={selectedId}
        canEdit={canEdit}
        locale={locale}
        storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
        labels={dict.categories}
        imageLabels={dict.theme.media}
        mediaLabels={dict.media}
        heroLabels={dict.sitePages.fields}
      />
    </div>
  );
}
