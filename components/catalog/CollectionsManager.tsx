/**
 * COLLECTIONS (Classic, Bridal, Italiano…) — list on one side, the chosen collection's form on the other.
 * ------------------------------------------------------------------
 *   - Drag a row (or use the ↑ ↓ buttons) to change the order on the website → PUT /api/collections/order
 *   - Form: names, link (slug), picture, hide from website
 *     → POST /api/collections (new) or PUT /api/collections/<id>
 *   - Delete → DELETE /api/collections/<id>  (its products stay, without a collection)
 *   - Put a product in a collection: Products → open the product → "Collection"
 * The chosen collection is in the address: /collections?c=<id>  (/collections?c=new = new collection)
 * Where they show: homepage block "Collections" (storefront → BrandsSection.tsx) + the product filter.
 * Rules: lib/validation/catalog.ts → brandSchema. Texts: dictionaries → "collections".
 * In the code a collection is called "brand" (AdminBrand, brandId).
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { AdminBrand, BrandInput, Locale } from "@/types";
import { slugify } from "@/lib/catalog/helpers";
import { fill, t } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { ImageField } from "@/components/theme/ImageField";
import { Toggle } from "@/components/theme/fields";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { MediaLabels } from "@/components/media/MediaBrowser";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Labels = Omit<Dictionary["collections"], "errors"> & { errors: Record<string, string> };
type ImageLabels = { choose: string; change: string; remove: string; or: string; none: string };

const EMPTY: BrandInput = { name: { ar: "", en: "" }, slug: "", visible: true };
const input = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function CollectionsManager({
  collections,
  selectedId,
  canEdit,
  locale,
  storefrontUrl,
  labels,
  imageLabels,
  mediaLabels,
}: {
  collections: AdminBrand[];
  /** id, "new", or undefined */
  selectedId?: string;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: Labels;
  imageLabels: ImageLabels;
  mediaLabels: MediaLabels;
}) {
  const router = useRouter();
  const [list, setList] = useState(collections);
  const [dragId, setDragId] = useState<string | null>(null);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  useEffect(() => setList(collections), [collections]);

  const selected = selectedId === "new" ? null : list.find((c) => c.id === selectedId);

  async function saveOrder(next: AdminBrand[]) {
    setList(next);
    setOrderMsg(null);
    const res = await fetch("/api/collections/order", {
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
            <Link href="/collections?c=new" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gold px-3 text-sm font-semibold text-gold-foreground hover:opacity-90">
              <Plus className="size-4" />
              {labels.add}
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{labels.intro}</p>
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
              <Link href={`/collections?c=${encodeURIComponent(c.id)}`} className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{t(c.name, locale)}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {locale === "ar" ? c.name.en : c.name.ar} · {fill(labels.products, { n: c.productCount })}
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
        <CollectionForm
          key={selectedId}
          collection={selected ?? null}
          canEdit={canEdit}
          locale={locale}
          storefrontUrl={storefrontUrl}
          labels={labels}
          imageLabels={imageLabels}
          mediaLabels={mediaLabels}
        />
      ) : (
        <section className="hidden min-h-64 items-center justify-center rounded-xl border border-dashed p-10 text-muted-foreground lg:flex">{labels.pick}</section>
      )}
    </div>
  );
}

function CollectionForm({
  collection,
  canEdit,
  locale,
  storefrontUrl,
  labels: L,
  imageLabels,
  mediaLabels,
}: {
  collection: AdminBrand | null;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  labels: Labels;
  imageLabels: ImageLabels;
  mediaLabels: MediaLabels;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BrandInput>(
    collection ? { name: collection.name, slug: collection.slug, logo: collection.logo, visible: collection.visible } : EMPTY,
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
  const set = <K extends keyof BrandInput>(k: K, v: BrandInput[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _d, ...rest } = e;
      return rest;
    });
  };
  const err = (path: string) => (errors[path] ? L.errors[errors[path]] ?? L.errors.required : undefined);

  async function save() {
    setSaving(true);
    setMessage(null);
    const body: BrandInput = { ...form, logo: form.logo?.url ? { url: form.logo.url } : undefined };
    const res = await fetch(collection ? `/api/collections/${encodeURIComponent(collection.id)}` : "/api/collections", {
      method: collection ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setMessage({ tone: "ok", text: L.saved });
      if (!collection) router.replace(`/collections?c=${encodeURIComponent(data.id)}`);
      router.refresh();
      return;
    }
    if (Array.isArray(data.issues)) setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    else if (data.error === "slug_taken") setErrors({ slug: "slug_taken" });
    setMessage({ tone: "error", text: L.errors[data.error] ?? (res?.status === 403 ? L.errors.forbidden : L.errors.failed) });
  }

  async function remove() {
    if (!collection) return;
    const res = await fetch(`/api/collections/${encodeURIComponent(collection.id)}`, { method: "DELETE" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setDeleteOpen(false);
    if (res?.ok) {
      router.replace("/collections");
      router.refresh();
    } else setMessage({ tone: "error", text: L.errors[data.error] ?? L.errors.failed });
  }

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <Link href="/collections" className="self-start text-sm font-semibold text-gold lg:hidden">
        ← {L.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{collection ? fill(L.editTitle, { name: t(collection.name, locale) }) : L.newTitle}</h2>
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
        </div>
        {/* PICTURE: cut to 4:3 by the cropper (size: config/image-frames.ts → collectionImage) */}
        <ImageField
          frame="collectionImage"
          label={L.image}
          hint={L.imageHint}
          value={form.logo?.url ?? ""}
          onChange={(url) => set("logo", url ? { url } : undefined)}
          storefrontUrl={storefrontUrl}
          labels={imageLabels}
          mediaLabels={mediaLabels}
          locale={locale}
          disabled={!canEdit}
        />
        <Toggle label={L.hide} checked={!form.visible} disabled={!canEdit} onChange={(v) => set("visible", !v)} />
      </fieldset>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm font-semibold", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {collection ? (
            <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
              <Trash2 className="size-4" />
              {L.delete}
            </button>
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
          <DialogDescription>{fill(L.deleteConfirm, { name: collection ? t(collection.name, locale) : "" })}</DialogDescription>
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
