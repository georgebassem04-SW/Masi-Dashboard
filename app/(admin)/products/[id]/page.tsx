/**
 * PAGE: /products/<id> — EDIT PRODUCT (design screen 6)
 * The form itself: components/catalog/ProductForm.tsx. Data: api.getProduct() + categories + today's gold prices.
 * Needs permission "products" (view to see, edit to save).
 */
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { t } from "@/lib/format";
import { storeConfig } from "@/config/store";
import { NoAccess, NoticePage } from "@/components/common/NoticePage";
import { ProductForm } from "@/components/catalog/ProductForm";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  const session = await requireStaff();
  const product = can(session, "products") ? await api.getProduct(decodeURIComponent((await params).id), session.token) : null;
  return { title: product ? t(product.name, await getLocale()) : (await getDictionary(await getLocale())).nav.products };
}

export default async function EditProductPage({ params, searchParams }: PageProps<"/products/[id]">) {
  const session = await requireStaff();
  if (!can(session, "products")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [product, categories, goldPrices, brands] = await Promise.all([
    api.getProduct(decodeURIComponent((await params).id), session.token),
    api.listCategories(session.token),
    api.getGoldPrices(session.token),
    api.listBrands(session.token),
  ]);
  if (!product) return <NoticePage icon={SearchX} title={dict.products.form.notFound} backLabel={dict.products.form.back} />;

  const { id, source, createdAt: _c, updatedAt: _u, collectionId: _col, videos: _v, ...input } = product;
  return (
    <ProductForm
      key={product.updatedAt}
      id={id}
      source={source}
      initial={input}
      categories={categories.map((c) => ({ id: c.id, name: t(c.name, locale) }))}
      collections={brands.map((b) => ({ id: b.id, name: t(b.name, locale) }))}
      goldPrices={goldPrices}
      currency={storeConfig.currency}
      canEdit={can(session, "products", "edit")}
      locale={locale}
      storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
      justSaved={(await searchParams).saved === "1"}
      labels={{ form: dict.products.form, errors: dict.products.errors, stock: dict.products.stock }}
      mediaLabels={dict.media}
      imageShape={(await api.getThemeState(session.token)).published.layout.productImageRatio}
    />
  );
}
