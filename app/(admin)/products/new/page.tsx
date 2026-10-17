/**
 * PAGE: /products/new — ADD PRODUCT
 * For pieces that aren't in the ERP (yet). Everything is editable, including sizes, weight and stock.
 * Opening /products/new?categoryId=cat-rings pre-selects the category.
 * Needs permission "products" = edit.
 */
import type { Metadata } from "next";
import type { ProductInput } from "@/types";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { t } from "@/lib/format";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { ProductForm } from "@/components/catalog/ProductForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).products.form.newTitle };
}

/** Starting values of a new product (change freely) */
const EMPTY: ProductInput = {
  name: { ar: "", en: "" },
  description: { ar: "", en: "" },
  categoryId: "",
  slug: "",
  sku: "",
  metal: "yellow_gold",
  karat: 21,
  pricingMode: "weight_based",
  makingCharge: { type: "per_gram", value: 0 },
  stones: [],
  images: [],
  tags: [],
  isFeatured: false,
  isNew: true,
  visible: true,
  variants: [{ id: "new-1", sku: "", size: "", weightGrams: 0, stockQty: 0, stockStatus: "out_of_stock" }],
};

export default async function NewProductPage({ searchParams }: PageProps<"/products/new">) {
  const session = await requireStaff();
  if (!can(session, "products", "edit")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [categories, goldPrices, brands] = await Promise.all([api.listCategories(session.token), api.getGoldPrices(session.token), api.listBrands(session.token)]);
  const wanted = (await searchParams).categoryId;
  const categoryId = typeof wanted === "string" && categories.some((c) => c.id === wanted) ? wanted : "";

  return (
    <ProductForm
      source="manual"
      initial={{ ...EMPTY, categoryId }}
      categories={categories.map((c) => ({ id: c.id, name: t(c.name, locale) }))}
      collections={brands.map((b) => ({ id: b.id, name: t(b.name, locale) }))}
      goldPrices={goldPrices}
      currency={storeConfig.currency}
      canEdit
      locale={locale}
      storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
      labels={{ form: dict.products.form, errors: dict.products.errors, stock: dict.products.stock }}
      mediaLabels={dict.media}
      imageShape={(await api.getThemeState(session.token)).published.layout.productImageRatio}
    />
  );
}
