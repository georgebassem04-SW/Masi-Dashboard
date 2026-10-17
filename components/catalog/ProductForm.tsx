/**
 * PRODUCT FORM (design screen 6) — used by /products/new and /products/<id>.
 * ------------------------------------------------------------------
 *   Main column: basic info · gold & pricing (karat, metal, making charge, stones) · images · sizes & stock
 *   Side column: price preview with today's gold price · visibility · certificate · save / delete
 * ERP products: SKU, sizes, weight, stock (and fixed prices) are grey and locked — they come from the ERP.
 * Products added here ("manual"): everything is editable, and they can be deleted.
 * Saves to POST /api/products (new) or PUT /api/products/<id>; rules: lib/validation/catalog.ts
 * Texts: dictionaries → "products.form" and "products.errors".
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Crop, ExternalLink, ImagePlus, Plus, Trash2 } from "lucide-react";
import type { GoldPrice, Karat, Locale, MakingCharge, MediaImage, Metal, Product, ProductInput, ProductSource, Stone } from "@/types";
import { calculatePrice } from "@/lib/catalog/pricing";
import { slugify, variantStatus } from "@/lib/catalog/helpers";
import { KARATS } from "@/lib/catalog/query";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUndoRedo } from "@/lib/hooks/use-undo-redo";
import { UndoRedo } from "@/components/common/UndoRedo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MediaBrowser, type MediaLabels } from "@/components/media/MediaBrowser";
import { ImageCropper } from "@/components/media/ImageCropper";
import { IMAGE_FRAMES } from "@/config/image-frames";
import { Toggle } from "@/components/theme/fields";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Labels = {
  form: Dictionary["products"]["form"];
  errors: Record<string, string>;
  stock: Record<string, string>;
};

const METALS: Metal[] = ["yellow_gold", "white_gold", "rose_gold", "platinum", "silver"];
const STONE_TYPES: Stone["type"][] = ["diamond", "ruby", "emerald", "sapphire", "pearl", "zircon", "other"];
const input = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted disabled:text-muted-foreground";
const small = "h-10 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted disabled:text-muted-foreground";

export function ProductForm({
  id,
  source,
  initial,
  categories,
  collections,
  goldPrices,
  currency,
  canEdit,
  locale,
  storefrontUrl,
  justSaved,
  labels,
  mediaLabels,
  imageShape = "square",
}: {
  /** Shape of product photos on the website (Theme & design → Layout). Every photo is cropped / fitted to it */
  imageShape?: "square" | "portrait";
  /** undefined = new product */
  id?: string;
  source: ProductSource;
  initial: ProductInput;
  categories: { id: string; name: string }[];
  /** Collections to choose from (dashboard → Collections) */
  collections: { id: string; name: string }[];
  goldPrices: GoldPrice[];
  currency: string;
  canEdit: boolean;
  locale: Locale;
  storefrontUrl: string;
  /** Came back here right after creating the product */
  justSaved?: boolean;
  labels: Labels;
  mediaLabels: MediaLabels;
}) {
  const f = labels.form;
  const router = useRouter();
  const [form, setForm] = useState<ProductInput>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join("، "));
  const [descTab, setDescTab] = useState<Locale>(locale);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(justSaved ? { tone: "ok", text: f.saved } : null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const locked = !canEdit;
  const erp = source === "erp";

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
    setDirty(true);
    setErrors((e) => {
      const { [key as string]: _drop, ...rest } = e;
      return rest;
    });
  };
  const err = (path: string) => (errors[path] ? labels.errors[errors[path]] ?? labels.errors.required : undefined);
  // UNDO / REDO: the whole form + the tags box
  const history = useUndoRedo({ form, tagsText }, (v) => {
    setForm(v.form);
    setTagsText(v.tagsText);
    setDirty(true);
    setErrors({});
  });

  /* ----- price preview ----- */
  const preview = useMemo(() => {
    const variant = form.variants[Math.min(previewIndex, form.variants.length - 1)];
    if (!variant) return null;
    const rate = goldPrices.find((g) => g.karat === form.karat)?.pricePerGram;
    const p = calculatePrice({ ...form, id: "", createdAt: "" } as Product, variant, goldPrices);
    return { ...p, rate, weight: variant.weightGrams };
  }, [form, previewIndex, goldPrices]);
  const money = (n: number) => new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  /* ----- save ----- */
  async function save() {
    setSaving(true);
    setMessage(null);
    const tags = tagsText
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const body: ProductInput = {
      ...form,
      tags,
      stones: form.stones.map((s) => ({ ...s, price: s.price || undefined, caratWeight: s.caratWeight || undefined, color: s.color || undefined, clarity: s.clarity || undefined })),
      variants: form.variants.map((v) => ({ ...v, size: v.size || undefined, length: v.length || undefined, fixedPrice: form.pricingMode === "fixed" ? { amount: v.fixedPrice?.amount ?? 0, currency } : undefined })),
      certificate: form.certificate?.issuer || form.certificate?.number ? form.certificate : undefined,
    };
    const res = await fetch(id ? `/api/products/${encodeURIComponent(id)}` : "/api/products", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      setDirty(false);
      // Reload the saved product; "?saved=1" keeps the "Saved" message after the reload
      router.replace(`/products/${encodeURIComponent(data.id ?? id)}?saved=1`);
      router.refresh();
      return;
    }
    if (data.error === "validation" && Array.isArray(data.issues)) {
      setErrors(Object.fromEntries(data.issues.map((i: { path: string; code: string }) => [i.path, i.code])));
    } else if (data.error === "slug_taken") setErrors({ slug: "slug_taken" });
    else if (data.error === "sku_taken") setErrors({ sku: "sku_taken" });
    setMessage({ tone: "error", text: labels.errors[data.error] ?? (res?.status === 403 ? labels.errors.forbidden : labels.errors.failed) });
  }

  async function remove() {
    if (!id) return;
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) {
      setDirty(false);
      router.replace("/products");
      router.refresh();
    } else {
      setDeleteOpen(false);
      setMessage({ tone: "error", text: labels.errors[data.error] ?? labels.errors.failed });
    }
  }

  /* ----- images ----- */
  // Product photos have one fixed shape: a chosen picture goes through the cropper first (components/media/ImageCropper.tsx)
  const photoFrame = IMAGE_FRAMES[imageShape === "portrait" ? "productPortrait" : "productSquare"];
  /** Picture waiting in the cropper. `replace` = position of the photo being re-cropped (undefined = a new photo) */
  const [cropping, setCropping] = useState<{ src: string; replace?: number } | null>(null);
  const fullUrl = (url: string) => (url.startsWith("/") ? `${storefrontUrl}${url}` : url);
  const addImage = (url: string) => {
    if (!url || form.images.some((i) => i.url === url)) return;
    set("images", [...form.images, { url } as MediaImage]);
  };
  const moveImage = (i: number, by: number) => {
    const list = [...form.images];
    const [item] = list.splice(i, 1);
    list.splice(i + by, 0, item);
    set("images", list);
  };

  /* ----- stones & sizes ----- */
  const setStone = (i: number, patch: Partial<Stone>) => set("stones", form.stones.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const setVariant = (i: number, patch: Partial<ProductInput["variants"][number]>) =>
    set(
      "variants",
      form.variants.map((v, k) => {
        if (k !== i) return v;
        const next = { ...v, ...patch };
        return { ...next, stockStatus: variantStatus(next.stockQty, next.stockStatus === "made_to_order") };
      }),
    );

  const catLink = form.slug ? `${storefrontUrl}/${locale}/products/${form.slug}` : null;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-7">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/products" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {f.back}
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-2xl font-bold">{(locale === "ar" ? form.name.ar : form.name.en) || form.name.ar || f.newTitle}</h2>
        {id && catLink && initial.visible && (
          <a href={catLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold hover:bg-muted">
            <ExternalLink className="size-4" />
            {f.viewOnSite}
          </a>
        )}
        {canEdit && (
          <>
            <UndoRedo history={history} keyboard disabled={saving} />
            <Link href="/products" className="inline-flex h-11 items-center rounded-lg border border-input bg-card px-4 text-sm font-semibold hover:bg-muted">
              {f.cancel}
            </Link>
            <button type="button" onClick={save} disabled={saving} className="h-11 rounded-lg bg-gold px-5 text-sm font-semibold text-gold-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? f.saving : f.save}
            </button>
          </>
        )}
      </div>
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-4 py-3 text-sm font-semibold", message.tone === "error" ? "bg-[#f6e0dc] text-destructive" : "bg-[var(--status-done-bg)] text-[var(--status-done-fg)]")}>
          {message.text}
        </p>
      )}
      {!canEdit && <p className="rounded-lg bg-accent px-4 py-3 text-sm">{f.viewOnly}</p>}
      {dirty && canEdit && <p className="text-xs text-[var(--status-progress-fg)]">{f.unsaved}</p>}

      <fieldset disabled={locked} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* ===== Main column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Section title={f.basics}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label={f.nameAr} error={err("name.ar")}>
                <input dir="rtl" className={input} value={form.name.ar} maxLength={150} onChange={(e) => set("name", { ...form.name, ar: e.target.value })} />
              </Labeled>
              <Labeled label={f.nameEn} error={err("name.en")}>
                <input dir="ltr" className={input} value={form.name.en} maxLength={150} onChange={(e) => set("name", { ...form.name, en: e.target.value })} />
              </Labeled>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{f.description}</span>
                <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
                  {(["ar", "en"] as Locale[]).map((l) => (
                    <button key={l} type="button" role="tab" aria-selected={descTab === l} onClick={() => setDescTab(l)} className={cn("h-8 rounded-md px-3 text-xs font-semibold", descTab === l ? "bg-card shadow-sm" : "text-muted-foreground")}>
                      {l === "ar" ? f.arabic : f.english}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                key={descTab}
                dir={descTab === "ar" ? "rtl" : "ltr"}
                aria-label={`${f.description} — ${descTab === "ar" ? f.arabic : f.english}`}
                rows={4}
                maxLength={4000}
                value={form.description[descTab]}
                onChange={(e) => set("description", { ...form.description, [descTab]: e.target.value })}
                className="rounded-lg border border-input bg-card px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:bg-muted"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label={f.category} error={err("categoryId")}>
                <select className={input} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">{f.chooseCategory}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Labeled>
              {/* COLLECTION (Classic, Bridal…): the list is managed in dashboard → Collections */}
              <Labeled label={f.collection}>
                <select className={input} value={form.brandId ?? ""} onChange={(e) => set("brandId", e.target.value || undefined)}>
                  <option value="">{f.noCollection}</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label={f.slug} error={err("slug")} hint={fill(f.slugHint, { slug: form.slug || "…" })}>
                <div className="flex gap-2">
                  <input dir="ltr" className={input} value={form.slug} maxLength={80} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
                  {!!form.name.en && (
                    <button type="button" onClick={() => set("slug", slugify(form.name.en))} className="h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-gold hover:bg-muted" title={f.makeSlug}>
                      {f.makeSlug}
                    </button>
                  )}
                </div>
              </Labeled>
            </div>
            <Labeled label={f.tags} hint={f.tagsHint}>
              <input
                className={input}
                value={tagsText}
                maxLength={600}
                onChange={(e) => {
                  setTagsText(e.target.value);
                  setDirty(true);
                }}
              />
            </Labeled>
          </Section>

          <Section title={f.gold} note={erp ? f.erpFields : undefined}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Labeled label={f.sku} error={err("sku")}>
                <input dir="ltr" className={input} value={form.sku} disabled={erp || locked} maxLength={60} onChange={(e) => set("sku", e.target.value.trim())} />
              </Labeled>
              <Labeled label={f.karat}>
                <select className={input} value={form.karat} onChange={(e) => set("karat", Number(e.target.value) as Karat)}>
                  {KARATS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label={f.metal}>
                <select className={input} value={form.metal} onChange={(e) => set("metal", e.target.value as Metal)}>
                  {METALS.map((m) => (
                    <option key={m} value={m}>
                      {f.metals[m]}
                    </option>
                  ))}
                </select>
              </Labeled>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Labeled label={f.pricingMode}>
                <select className={input} value={form.pricingMode} disabled={erp || locked} onChange={(e) => set("pricingMode", e.target.value as ProductInput["pricingMode"])}>
                  <option value="weight_based">{f.pricingModes.weight_based}</option>
                  <option value="fixed">{f.pricingModes.fixed}</option>
                </select>
              </Labeled>
              {form.pricingMode === "weight_based" && (
                <>
                  <Labeled label={f.makingType}>
                    <select className={input} value={form.makingCharge.type} onChange={(e) => set("makingCharge", { ...form.makingCharge, type: e.target.value as MakingCharge["type"] })}>
                      {(["per_gram", "fixed", "percent"] as const).map((t) => (
                        <option key={t} value={t}>
                          {f.makingTypes[t]}
                        </option>
                      ))}
                    </select>
                  </Labeled>
                  <Labeled label={fill(f.makingValue[form.makingCharge.type], { currency })} error={err("makingCharge.value")}>
                    <input type="number" inputMode="decimal" min={0} step="any" dir="ltr" className={input} value={form.makingCharge.value} onChange={(e) => set("makingCharge", { ...form.makingCharge, value: Number(e.target.value) || 0 })} />
                  </Labeled>
                </>
              )}
            </div>

            {/* Stones */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{f.stones}</span>
                <button type="button" onClick={() => set("stones", [...form.stones, { type: "zircon", count: 1 }])} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted">
                  <Plus className="size-4" />
                  {f.addStone}
                </button>
              </div>
              {form.stones.length === 0 && <p className="text-sm text-muted-foreground">{f.noStones}</p>}
              {form.stones.map((s, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-[1.3fr_0.7fr_0.8fr_0.8fr_0.8fr_1.1fr_auto]">
                  <MiniField label={f.stoneType}>
                    <select className={small} value={s.type} onChange={(e) => setStone(i, { type: e.target.value as Stone["type"] })}>
                      {STONE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {f.stoneTypes[t]}
                        </option>
                      ))}
                    </select>
                  </MiniField>
                  <MiniField label={f.stoneCount}>
                    <input type="number" min={1} dir="ltr" className={small} value={s.count} onChange={(e) => setStone(i, { count: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                  </MiniField>
                  <MiniField label={f.carat}>
                    <input type="number" min={0} step="any" dir="ltr" className={small} value={s.caratWeight ?? ""} onChange={(e) => setStone(i, { caratWeight: Number(e.target.value) || undefined })} />
                  </MiniField>
                  <MiniField label={f.color}>
                    <input dir="ltr" maxLength={20} className={small} value={s.color ?? ""} onChange={(e) => setStone(i, { color: e.target.value })} />
                  </MiniField>
                  <MiniField label={f.clarity}>
                    <input dir="ltr" maxLength={20} className={small} value={s.clarity ?? ""} onChange={(e) => setStone(i, { clarity: e.target.value })} />
                  </MiniField>
                  <MiniField label={fill(f.stonePrice, { currency })}>
                    <input type="number" min={0} step="any" dir="ltr" className={small} value={s.price ?? ""} onChange={(e) => setStone(i, { price: Number(e.target.value) || undefined })} />
                  </MiniField>
                  <button type="button" onClick={() => set("stones", form.stones.filter((_, k) => k !== i))} aria-label={f.remove} className="self-end justify-self-start rounded-lg p-2.5 text-destructive hover:bg-[#f6e0dc]">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* Images */}
          <Section title={`${f.images} (${form.images.length})`} note={f.imagesHint}>
            {form.images.length === 0 && <p className="text-sm text-muted-foreground">{f.noImages}</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {form.images.map((img, i) => (
                <li key={img.url} className="flex flex-col overflow-hidden rounded-lg border bg-card">
                  <div className="relative bg-muted" style={{ aspectRatio: `${photoFrame.w} / ${photoFrame.h}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fullUrl(img.url)} alt="" className="size-full object-cover" />
                    {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-gold-foreground">{f.main}</span>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center justify-between border-t px-1 py-1">
                      <span className="flex">
                        <IconButton label={f.moveUp} disabled={i === 0} onClick={() => moveImage(i, -1)}>
                          <ArrowUp className="size-4 rtl:rotate-0" />
                        </IconButton>
                        <IconButton label={f.moveDown} disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)}>
                          <ArrowDown className="size-4" />
                        </IconButton>
                      </span>
                      <IconButton label={mediaLabels.crop.adjust} onClick={() => setCropping({ src: fullUrl(img.url), replace: i })}>
                        <Crop className="size-4" />
                      </IconButton>
                      <IconButton label={f.remove} danger onClick={() => set("images", form.images.filter((_, k) => k !== i))}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setLibraryOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold hover:bg-muted">
                  <ImagePlus className="size-4" />
                  {f.fromLibrary}
                </button>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (/^https?:\/\/|^\//.test(imageUrl.trim())) {
                      setCropping({ src: fullUrl(imageUrl.trim()) });
                      setImageUrl("");
                    }
                  }}
                  className="flex min-w-60 flex-1 gap-2"
                >
                  <input dir="ltr" aria-label={f.pasteUrl} placeholder={f.pasteUrl} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={small} />
                  <button type="submit" className="h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-gold hover:bg-muted">
                    {f.addUrl}
                  </button>
                </form>
              </div>
            )}
            <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
              <SheetContent side="end" closeLabel="×" className="w-[95%] max-w-3xl gap-4 overflow-y-auto p-5">
                <SheetTitle>{f.addImage}</SheetTitle>
                {libraryOpen && (
                  <MediaBrowser
                    labels={mediaLabels}
                    locale={locale}
                    canEdit
                    compact
                    onSelect={(item) => {
                      setLibraryOpen(false);
                      setCropping({ src: fullUrl(item.url) });
                    }}
                  />
                )}
              </SheetContent>
            </Sheet>
          </Section>

          <ImageCropper
            open={cropping !== null}
            onOpenChange={(v) => !v && setCropping(null)}
            src={cropping?.src ?? ""}
            frame={photoFrame}
            labels={mediaLabels.crop}
            onDone={(url) => {
              const at = cropping?.replace;
              if (at === undefined) addImage(url);
              else set("images", form.images.map((img, k) => (k === at ? { ...img, url } : img)));
            }}
          />

          {/* Sizes & stock */}
          <Section title={f.variants} note={erp ? f.variantsErp : undefined}>
            {err("variants") && <p className="text-sm text-destructive">{err("variants")}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-start font-semibold">{f.size}</th>
                    <th className="py-2 text-start font-semibold">{f.sku}</th>
                    <th className="py-2 text-start font-semibold">{f.weight}</th>
                    <th className="py-2 text-start font-semibold">{f.qty}</th>
                    {form.pricingMode === "fixed" && <th className="py-2 text-start font-semibold">{fill(f.fixedPrice, { currency })}</th>}
                    <th className="py-2 text-start font-semibold">{f.status}</th>
                    {!erp && canEdit && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, i) => {
                    const off = erp || locked;
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2 pe-2">
                          <input aria-label={f.size} className={small} value={v.size ?? ""} disabled={off} maxLength={20} onChange={(e) => setVariant(i, { size: e.target.value })} />
                        </td>
                        <td className="py-2 pe-2">
                          <input aria-label={f.sku} dir="ltr" className={cn(small, errors[`variants.${i}.sku`] && "border-destructive")} value={v.sku} disabled={off} maxLength={60} onChange={(e) => setVariant(i, { sku: e.target.value.trim() })} />
                        </td>
                        <td className="py-2 pe-2">
                          <input aria-label={f.weight} type="number" min={0} step="any" dir="ltr" className={cn(small, errors[`variants.${i}.weightGrams`] && "border-destructive")} value={v.weightGrams || ""} disabled={off} onChange={(e) => setVariant(i, { weightGrams: Number(e.target.value) || 0 })} />
                        </td>
                        <td className="py-2 pe-2">
                          <input aria-label={f.qty} type="number" min={0} dir="ltr" className={small} value={v.stockQty} disabled={off} onChange={(e) => setVariant(i, { stockQty: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                        </td>
                        {form.pricingMode === "fixed" && (
                          <td className="py-2 pe-2">
                            <input aria-label={f.fixedPrice} type="number" min={0} dir="ltr" className={small} value={v.fixedPrice?.amount ?? ""} disabled={off} onChange={(e) => setVariant(i, { fixedPrice: { amount: Number(e.target.value) || 0, currency } })} />
                          </td>
                        )}
                        <td className="py-2 pe-2">
                          {off ? (
                            <span className="text-xs font-semibold">{labels.stock[v.stockStatus]}</span>
                          ) : (
                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                              <input type="checkbox" className="size-4 accent-[var(--gold)]" checked={v.stockStatus === "made_to_order"} onChange={(e) => setVariant(i, { stockStatus: e.target.checked ? "made_to_order" : "in_stock" })} />
                              {f.madeToOrder}
                            </label>
                          )}
                        </td>
                        {!erp && canEdit && (
                          <td className="py-2">
                            <IconButton label={f.remove} danger disabled={form.variants.length === 1} onClick={() => set("variants", form.variants.filter((_, k) => k !== i))}>
                              <Trash2 className="size-4" />
                            </IconButton>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!erp && canEdit && (
              <button
                type="button"
                onClick={() => set("variants", [...form.variants, { id: `new-${Date.now()}`, sku: "", size: "", weightGrams: 0, stockQty: 0, stockStatus: "out_of_stock" }])}
                className="inline-flex h-9 items-center gap-1 self-start rounded-lg px-2 text-sm font-semibold text-gold hover:bg-muted"
              >
                <Plus className="size-4" />
                {f.addVariant}
              </button>
            )}
          </Section>
        </div>

        {/* ===== Side column ===== */}
        <div className="flex min-w-0 flex-col gap-5">
          <Section title={f.preview}>
            {form.variants.length > 1 && (
              <Labeled label={f.previewFor}>
                <select className={input} value={previewIndex} onChange={(e) => setPreviewIndex(Number(e.target.value))} disabled={false}>
                  {form.variants.map((v, i) => (
                    <option key={v.id} value={i}>
                      {[v.size, `${v.weightGrams} g`].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              </Labeled>
            )}
            {preview && (
              <dl className="flex flex-col gap-2 text-sm">
                {form.pricingMode === "weight_based" && (
                  <>
                    <PriceRow label={fill(f.rate, { karat: form.karat })} value={preview.rate ? money(preview.rate) : f.noRate} />
                    <PriceRow label={fill(f.metalValue, { weight: preview.weight })} value={money(preview.metalValue)} />
                    <PriceRow label={f.making} value={money(preview.makingCharge)} />
                  </>
                )}
                <PriceRow label={f.stonesTotal} value={money(preview.stones)} />
                <div className="mt-1 flex justify-between border-t pt-3 text-base font-bold">
                  <dt>{f.sitePrice}</dt>
                  <dd>{money(preview.total)}</dd>
                </div>
              </dl>
            )}
            <p className="text-xs text-muted-foreground">{f.previewNote}</p>
          </Section>

          <Section title={f.visibility}>
            <Toggle label={f.visible} checked={form.visible} disabled={locked} onChange={(v) => set("visible", v)} />
            <Toggle label={f.featured} checked={form.isFeatured} disabled={locked} onChange={(v) => set("isFeatured", v)} />
            <Toggle label={f.isNew} checked={form.isNew} disabled={locked} onChange={(v) => set("isNew", v)} />
          </Section>

          <Section title={f.certificate}>
            <Toggle label={f.hasCertificate} checked={!!form.certificate} disabled={locked} onChange={(v) => set("certificate", v ? { issuer: "", number: "" } : undefined)} />
            {form.certificate && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Labeled label={f.issuer} error={err("certificate.issuer")}>
                  <input className={input} maxLength={80} value={form.certificate.issuer} onChange={(e) => set("certificate", { ...form.certificate!, issuer: e.target.value })} />
                </Labeled>
                <Labeled label={f.certNumber} error={err("certificate.number")}>
                  <input dir="ltr" className={input} maxLength={80} value={form.certificate.number} onChange={(e) => set("certificate", { ...form.certificate!, number: e.target.value })} />
                </Labeled>
              </div>
            )}
          </Section>

          {id && canEdit && (
            <Section title={f.danger}>
              {erp ? (
                <p className="text-sm text-muted-foreground">{f.erpNoDelete}</p>
              ) : (
                <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex h-10 items-center gap-2 self-start rounded-lg px-3 text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
                  <Trash2 className="size-4" />
                  {f.delete}
                </button>
              )}
            </Section>
          )}
        </div>
      </fieldset>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent closeLabel={f.cancel}>
          <DialogTitle>{f.delete}</DialogTitle>
          <DialogDescription>{fill(f.deleteConfirm, { name: form.name[locale] || form.name.ar })}</DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteOpen(false)} className="h-11 rounded-lg px-4 font-semibold hover:bg-muted">
              {f.cancel}
            </button>
            <button type="button" onClick={remove} className="h-11 rounded-lg bg-destructive px-5 font-semibold text-white">
              {f.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{title}</h3>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Labeled({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      <span className={cn("contents", error && "[&_input]:border-destructive [&_select]:border-destructive")}>{children}</span>
      {error ? <span className="text-xs text-destructive">{error}</span> : hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn("rounded-md p-2 disabled:opacity-30", danger ? "text-destructive hover:bg-[#f6e0dc]" : "hover:bg-muted")}>
      {children}
    </button>
  );
}
