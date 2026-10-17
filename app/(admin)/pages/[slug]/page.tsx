/**
 * PAGE: /pages/<slug> — PAGE EDITOR (design screen 16)
 * Everything happens in components/pages/PageEditor.tsx. Data: api.getPage() + categories and other pages
 * (for the "button opens…" choices).
 * Needs permission "content" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { t } from "@/lib/format";
import { isShopPage, pagePath } from "@/lib/pages/paths";
import { storeConfig } from "@/config/store";
import { NoAccess, NoticePage } from "@/components/common/NoticePage";
import { PageEditor } from "@/components/pages/PageEditor";

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const session = await requireStaff();
  const page = can(session, "content") ? await api.getPage(decodeURIComponent((await params).slug), session.token) : null;
  const title = page ? (page.draft ?? page.published)?.title : undefined;
  return { title: title ? t(title, await getLocale()) : (await getDictionary(await getLocale())).nav.pages };
}

export default async function EditSitePage({ params, searchParams }: PageProps<"/pages/[slug]">) {
  const session = await requireStaff();
  if (!can(session, "content")) return <NoAccess />;

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const slug = decodeURIComponent((await params).slug);
  const [page, pages, categories, products] = await Promise.all([api.getPage(slug, session.token), api.listPages(session.token), api.listCategories(session.token), api.listProducts({ pageSize: 5000, sort: "name" }, session.token)]);
  if (!page) return <NoticePage icon={SearchX} title={dict.sitePages.editor.notFound} backLabel={dict.sitePages.editor.back} />;
  const sp = await searchParams;

  return (
    <PageEditor
      // A new version from the server (publish, discard…) reloads the editor
      key={`${page.slug}-${page.publishedAt ?? ""}-${page.draft ? "d" : "p"}-${sp.v ?? ""}`}
      page={page}
      initialSection={typeof sp.s === "string" ? sp.s : undefined}
      justPublished={sp.published === "1"}
      canEdit={can(session, "content", "edit")}
      locale={locale}
      storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
      categories={categories.filter((c) => c.visible).map((c) => ({ id: c.id, slug: c.slug, name: t(c.name, locale) }))}
      // Products a button can open (visible ones only)
      linkProducts={products.items.filter((p) => p.visible).map((p) => ({ slug: p.slug, name: t(p.name, locale), sku: p.sku }))}
      otherPages={pages.filter((p) => p.slug !== slug && !isShopPage(p.slug)).map((p) => ({ path: pagePath(p.slug), name: t(p.title, locale) || p.slug }))}
      labels={dict.sitePages}
      imageLabels={dict.theme.media}
      mediaLabels={dict.media}
    />
  );
}
