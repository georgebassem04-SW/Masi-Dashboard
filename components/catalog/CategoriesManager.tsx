/**
 * CATEGORIES (design screen 7) — list on one side, the chosen category's form on the other.
 * ------------------------------------------------------------------
 *   - Drag a row (or use the ↑ ↓ buttons) to change the order on the website → PUT /api/categories/order
 *   - Form: names, link (slug), parent category, short descriptions, card image, banner, hide from website
 *     → POST /api/categories (new) or PUT /api/categories/<id>
 *   - Delete: only when the category has no products and no sub-categories → DELETE /api/categories/<id>
 * The chosen category is in the address: /categories?c=<id>  (/categories?c=new = new category)
 * Rules: lib/validation/catalog.ts. Texts: dictionaries → "categories".
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { AdminCategory, CategoryInput, Locale } from "@/types";
import { slugify } from "@/lib/catalog/helpers";
import { fill, t } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { ImageField } from "@/components/theme/ImageField";
import { HeroShowSwitches, HeroStyleEditor } from "@/components/pages/HeroStyleEditor";
import type { EditorCtx } from "@/components/pages/fields";
import { Choice, Toggle } from "@/components/theme/fields";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Labels = Omit<Dictionary["categories"], "errors"> & { errors: Record<string, string> };
type ImageLabels = { choose: string; change: string; remove: string; or: string; none: string };

const EMPTY: CategoryInput = { name: { ar: "", en: "" }, slug: "", description: { ar: "", en: "" }, visible: true };
const input = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function CategoriesManager({
  categories,
  selectedId,
  canEdit,
  locale,
  storefrontUrl,
  labels,
  imageLabels,
  mediaLabels,
  heroLabels,
}: {
  categories: AdminCategory[];
  /** id, "new", or undefined */
  selectedId?: string;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: Labels;
  imageLabels: ImageLabels;
  mediaLabels: MediaLabels;
  /** Texts of the banner layout editor (dictionaries → sitePages.fields) */
  heroLabels: EditorCtx["labels"]["fields"];
}) {
  const router = useRouter();
  const [list, setList] = useState(categories);
  const [dragId, setDragId] = useState<string | null>(null);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  useEffect(() => setList(categories), [categories]);

  const selected = selectedId === "new" ? null : list.find((c) => c.id === selectedId);
  const nameOf = (id?: string) => (id ? t(list.find((c) => c.id === id)?.name, locale) : "");

  async function saveOrder(next: AdminCategory[]) {
    setList(next);
    setOrderMsg(null);
    const res = await fetch("/api/categories/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    }).catch(() => null);
    setOrderMsg(res?.ok ? labels.orderSaved : labels.errors.failed);
    if (res?.ok) router.refresh();
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const showForm = !!selected || selectedId === "new";

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
      {/* ===== List ===== */}
      <section className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", showForm && "hidden lg:flex")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{fill(labels.count, { n: list.length })}</span>
          {canEdit && (
            <Link href="/categories?c=new" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gold px-3 text-sm font-semibold text-gold-foreground hover:opacity-90">
              <Plus className="size-4" />
              {labels.add}
            </Link>
          )}
        </div>
        {canEdit && <p className="text-xs text-muted-foreground">{labels.dragHint}</p>}
        <ol className="flex flex-col gap-1.5">
          {list.map((c, i) => (
            <li
              key={c.id}
              draggable={canEdit}
              onDragStart={(e) => {
                setDragId(c.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!dragId || dragId === c.id) return;
                e.preventDefault();
                const next = move(list.findIndex((x) => x.id === dragId), i);
                if (next) setList(next);
              }}
              onDragEnd={() => {
                if (dragId) void saveOrder(list);
                setDragId(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-2",
                c.id === selectedId ? "border-[#c9a961] bg-[#faf3e4]" : "border-transparent hover:bg-muted/60",
                dragId === c.id && "opacity-50",
              )}
            >
              {canEdit && <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />}
              <Link href={`/categories?c=${encodeURIComponent(c.id)}`} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{t(c.name, locale)}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {locale === "ar" ? c.name.en : c.name.ar} · {fill(labels.products, { n: c.productCount })}
                  {c.parentId && ` · ${fill(labels.sub, { parent: nameOf(c.parentId) })}`}
                </span>
              </Link>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", c.visible ? "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]" : "bg-muted text-muted-foreground")}>
                {c.visible ? labels.visible : labels.hidden}
              </span>
              {canEdit && (
                <span className="flex shrink-0">
                  <button type="button" aria-label={`${labels.moveUp}: ${t(c.name, locale)}`} disabled={i === 0} onClick={() => { const n = move(i, i - 1); if (n) void saveOrder(n); }} className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label={`${labels.moveDown}: ${t(c.name, locale)}`} disabled={i === list.length - 1} onClick={() => { const n = move(i, i + 1); if (n) void saveOrder(n); }} className="rounded-md p-1.5 hover:bg-muted disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ol>
        {orderMsg && (
          <p role="status" className="text-xs text-muted-foreground">
            {orderMsg}
          </p>
        )}
      </section>

      {/* ===== Form ===== */}
      {showForm ? (
        <CategoryForm
          key={selectedId}
          category={selected ?? null}
          all={list}
          canEdit={canEdit}
          locale={locale}
          storefrontUrl={storefrontUrl}
          labels={labels}
          imageLabels={imageLabels}
          mediaLabels={mediaLabels}
          heroLabels={heroLabels}
        />
      ) : (
        <section className="hidden min-h-64 items-center justify-center rounded-xl border border-dashed p-10 text-muted-foreground lg:flex">{labels.pick}</section>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  all,
  canEdit,
  locale,
  storefrontUrl,
  labels: L,
  imageLabels,
  mediaLabels,
  heroLabels,
}: {
  category: AdminCategory | null;
  all: AdminCategory[];
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: Labels;
  imageLabels: ImageLabels;
  mediaLabels: MediaLabels;
  /** Texts of the banner layout editor (dictionaries → sitePages.fields) */
  heroLabels: EditorCtx["labels"]["fields"];
}) {
  const router = useRouter();
  // The banner layout editor is the one from the page editor; it only needs its texts and "can edit"
  const heroCtx: EditorCtx = { lang: locale, disabled: !canEdit, missing: new Set(), labels: { fields: heroLabels, rte: {} as EditorCtx["labels"]["rte"], otherLang: "" }, categories: [], pages: [] };
  const [form, setForm] = useState<CategoryInput>(
    category
      ? { name: category.name, slug: category.slug, description: category.description ?? { ar: "", en: "" }, parentId: category.parentId, image: category.image, banner: category.banner, bannerStyle: category.bannerStyle, bannerHeight: category.bannerHeight, visible: category.visible }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // UNDO / REDO for this form
  const history = useUndoRedo(form, (v) => {
    setForm(v);
    setErrors({});
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const set = <K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _d, ...rest } = e;
      return rest;
    });
  };
  const err = (path: string) => (errors[path] ? L.errors[errors[path]] ?? L.errors.required : undefined);

  // A category can't be under itself or one of its own sub-categories
  const descendants = new Set<string>();
  if (category) {
    let added = true;
    descendants.add(category.id);
    while (added) {
      added = false;
      for (const c of all) if (c.parentId && descendants.has(c.parentId) && !descendants.has(c.id)) {
        descendants.add(c.id);
        added = true;
      }
    }
  }
  const parents = all.filter((c) => !descendants.has(c.id));

  async function save() {
    setSaving(true);
    setMessage(null);
    const body: CategoryInput = {
      ...form,
      parentId: form.parentId || undefined,
      description: form.description?.ar || form.description?.en ? form.description : undefined,
      image: form.image?.url ? { url: form.image.url } : undefined,
      banner: form.banner?.url ? { url: form.banner.url } : undefined,
    };
    const res = await fetch(category ? `/api/categories/${encodeURIComponent(category.id)}` : "/api/categories", {
      method: category ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setMessage({ tone: "ok", text: L.saved });
      if (!category) router.replace(`/categories?c=${encodeURIComponent(data.id)}`);
      router.refresh();
      return;
    }
    if (Array.isArray(data.issues)) setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    else if (data.error === "slug_taken") setErrors({ slug: "slug_taken" });
    setMessage({ tone: "error", text: L.errors[data.error] ?? (res?.status === 403 ? L.errors.forbidden : L.errors.failed) });
  }

  async function remove() {
    if (!category) return;
    const res = await fetch(`/api/categories/${encodeURIComponent(category.id)}`, { method: "DELETE" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setDeleteOpen(false);
    if (res?.ok) {
      router.replace("/categories");
      router.refresh();
    } else setMessage({ tone: "error", text: L.errors[data.error] ?? L.errors.failed });
  }

  const canDelete = !!category && category.productCount === 0 && !all.some((c) => c.parentId === category.id);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <Link href="/categories" className="self-start text-sm font-semibold text-gold lg:hidden">
        ← {L.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{category ? fill(L.editTitle, { name: t(category.name, locale) }) : L.newTitle}</h2>
        {category && (
          <Link href={`/products?categoryId=${encodeURIComponent(category.id)}`} className="text-sm font-semibold text-gold hover:underline">
            {L.viewProducts} ({category.productCount})
          </Link>
        )}
      </div>
      {!canEdit && <p className="rounded-lg bg-accent px-3 py-2 text-sm">{L.viewOnly}</p>}

      <fieldset disabled={!canEdit} className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label={L.nameAr} error={err("name.ar")}>
            <input dir="rtl" className={input} value={form.name.ar} maxLength={80} onChange={(e) => set("name", { ...form.name, ar: e.target.value })} />
          </Labeled>
          <Labeled label={L.nameEn} error={err("name.en")}>
            <input dir="ltr" className={input} value={form.name.en} maxLength={80} onChange={(e) => set("name", { ...form.name, en: e.target.value })} />
          </Labeled>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label={L.slug} error={err("slug")} hint={fill(L.slugHint, { slug: form.slug || "…" })}>
            <div className="flex gap-2">
              <input dir="ltr" className={input} value={form.slug} maxLength={80} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
              {!!form.name.en && (
                <button type="button" onClick={() => set("slug", slugify(form.name.en))} className="h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-gold hover:bg-muted">
                  {L.makeSlug}
                </button>
              )}
            </div>
          </Labeled>
          <Labeled label={L.parent} error={err("parentId")}>
            <select className={input} value={form.parentId ?? ""} onChange={(e) => set("parentId", e.target.value || undefined)}>
              <option value="">{L.noParent}</option>
              {parents.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name, locale)}
                </option>
              ))}
            </select>
          </Labeled>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label={L.descAr}>
            <textarea dir="rtl" rows={3} maxLength={500} className="rounded-lg border border-input bg-card px-3 py-2 text-sm" value={form.description?.ar ?? ""} onChange={(e) => set("description", { ar: e.target.value, en: form.description?.en ?? "" })} />
          </Labeled>
          <Labeled label={L.descEn}>
            <textarea dir="ltr" rows={3} maxLength={500} className="rounded-lg border border-input bg-card px-3 py-2 text-sm" value={form.description?.en ?? ""} onChange={(e) => set("description", { ar: form.description?.ar ?? "", en: e.target.value })} />
          </Labeled>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ImageField
            frame="categoryImage"
            label={L.image}
            hint={L.imageHint}
            value={form.image?.url ?? ""}
            onChange={(url) => set("image", url ? { url } : undefined)}
            storefrontUrl={storefrontUrl}
            labels={imageLabels}
            mediaLabels={mediaLabels}
            locale={locale}
            disabled={!canEdit}
          />
          <ImageField
            frame="categoryBanner"
            label={L.banner}
            hint={L.bannerHint}
            value={form.banner?.url ?? ""}
            onChange={(url) => set("banner", url ? { url } : undefined)}
            storefrontUrl={storefrontUrl}
            labels={imageLabels}
            mediaLabels={mediaLabels}
            locale={locale}
            disabled={!canEdit}
          />
        </div>
        {/* BANNER LAYOUT: where the category's title and text sit on its banner, colours, shade, height */}
        <div className="flex flex-col gap-3">
          <Choice label={heroLabels.hero.height} value={form.bannerHeight ?? "md"} disabled={!canEdit} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: heroLabels.hero.sizes[v] }))} onChange={(v) => set("bannerHeight", v)} />
          <HeroShowSwitches ctx={heroCtx} value={form.bannerStyle} onChange={(v) => set("bannerStyle", v)} parts={["showTitle", "showText"]} />
          <HeroStyleEditor ctx={heroCtx} kind="category" noButtons value={form.bannerStyle} onChange={(v) => set("bannerStyle", v)} hasImage={!!(form.banner?.url || form.image?.url)} buttonNames={[]} />
        </div>
        <Toggle label={L.hide} checked={!form.visible} disabled={!canEdit} onChange={(v) => set("visible", !v)} />
      </fieldset>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm font-semibold", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {category ? (
            canDelete ? (
              <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
                <Trash2 className="size-4" />
                {L.delete}
              </button>
            ) : (
              <span className="max-w-sm text-xs text-muted-foreground">{L.cannotDelete}</span>
            )
          ) : (
            <span />
          )}
          <span className="flex items-center gap-2">
            <UndoRedo history={history} keyboard disabled={saving} />
          <button type="button" onClick={save} disabled={saving} className="h-11 rounded-lg bg-gold px-6 font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? L.saving : L.save}
          </button>
          </span>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent closeLabel={L.cancel}>
          <DialogTitle>{L.delete}</DialogTitle>
          <DialogDescription>{fill(L.deleteConfirm, { name: category ? t(category.name, locale) : "" })}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {L.cancel}
            </button>
            <button type="button" onClick={remove} className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white">
              {L.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Labeled({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      <span className={cn("contents", error && "[&_input]:border-destructive")}>{children}</span>
      {error ? <span className="text-xs text-destructive">{error}</span> : hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
