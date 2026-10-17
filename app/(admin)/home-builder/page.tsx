/**
 * PAGE: /home-builder — HOMEPAGE (design screen 8)
 * ------------------------------------------------------------------
 *   [Homepage   status        Editing: العربية | English    View on website   Preview    Publish]
 *   [blocks list: ↑ ↓, show / hide · + Add section]   [form of the chosen block]
 * Same editor as the site pages (components/pages/PageEditor.tsx with `home`):
 *   - changes are saved automatically as a DRAFT; "Publish" puts them on the website; "Preview" shows the draft
 *   - blocks: main slider, gold prices, categories, product rows, offer, wide picture, collections, video
 *     + the content blocks of the pages (why us, image & text, numbers, call to action…)
 * Data: api.getHome() + categories, products (for "choose products"), collections, gold karats.
 *   - Block forms: components/pages/SectionForm.tsx (bottom part) · new-block templates: lib/pages/templates.ts
 *   - What must be filled before publishing: lib/pages/content.ts → publishProblems
 *   - Texts: dictionaries → "sitePages" (home, types, fields)
 * Needs permission "content" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { t } from "@/lib/format";
import { isShopPage, pagePath } from "@/lib/pages/paths";
import { storeConfig } from "@/config/store";
import type { AdminPage, PageContent } from "@/types";
import { NoAccess } from "@/components/common/NoticePage";
import { PageEditor } from "@/components/pages/PageEditor";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).nav.homeBuilder };
}

export default async function HomeBuilderPage({ searchParams }: PageProps<"/home-builder">) {
  const session = await requireStaff();
  if (!can(session, "content")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const [home, pages, categories, products, brands, goldPrices] = await Promise.all([
    api.getHome(session.token),
    api.listPages(session.token),
    api.listCategories(session.token),
    api.listProducts({ pageSize: 5000, sort: "name" }, session.token),
    api.listBrands(session.token),
    api.getGoldPrices(session.token),
  ]);
  const sp = await searchParams;
  // The editor works on "pages"; the homepage is given to it in the same shape (no title, always live)
  const asPage = (c: { sections: unknown[] } | null) => (c ? ({ title: { ar: "", en: "" }, sections: c.sections } as PageContent) : null);
  const page: AdminPage = {
    slug: "home",
    menu: "none",
    system: true,
    published: asPage(home.published),
    publishedAt: home.publishedAt,
    publishedBy: home.publishedBy,
    draft: asPage(home.draft),
    draftSavedAt: home.draftSavedAt,
    draftBy: home.draftBy,
    createdAt: home.publishedAt ?? "",
  };

  return (
    <PageEditor
      home
      // A new version from the server (publish, discard…) reloads the editor
      key={`home-${home.publishedAt ?? ""}-${home.draft ? "d" : "p"}-${sp.v ?? ""}`}
      page={page}
      initialSection={typeof sp.s === "string" ? sp.s : undefined}
      justPublished={sp.published === "1"}
      canEdit={can(session, "content", "edit")}
      locale={locale}
      storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
      categories={categories.filter((c) => c.visible).map((c) => ({ id: c.id, slug: c.slug, name: t(c.name, locale) }))}
      // Products a button can open (visible ones only)
      linkProducts={products.items.filter((p) => p.visible).map((p) => ({ slug: p.slug, name: t(p.name, locale), sku: p.sku }))}
      otherPages={pages.filter((p) => !isShopPage(p.slug)).map((p) => ({ path: pagePath(p.slug), name: t(p.title, locale) || p.slug }))}
      choices={{
        products: products.items.map((p) => ({ id: p.id, name: t(p.name, locale), sku: p.sku, imageUrl: p.imageUrl, visible: p.visible })),
        brands: brands.map((b) => ({ id: b.id, name: t(b.name, locale) })),
        karats: goldPrices.map((g) => g.karat).sort((a, b) => b - a),
      }}
      labels={dict.sitePages}
      imageLabels={dict.theme.media}
      mediaLabels={dict.media}
    />
  );
}
