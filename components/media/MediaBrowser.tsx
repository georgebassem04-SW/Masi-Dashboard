/**
 * MEDIA BROWSER — the file library: upload (button or drag & drop), grid, details panel.
 * Used in two places:
 *   - the Media library page (/media)      -> manage files: describe, copy link, delete one,
 *                                             or "Select" to tick several and delete them together
 *   - the picture pickers (logo, slides…)  -> `onSelect` is given: only PICTURES are listed and can be uploaded
 * Any file type is accepted, up to MAX_MB (pictures, videos, sound, PDF, Office files, zip…).
 * Talks to /api/media (rules in lib/media/image-check.ts — change the size limit there too).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckSquare, Copy, File as FileIcon, FileText, Film, ImagePlus, Music, Trash2, Upload, X } from "lucide-react";
import type { Locale, MediaItem, MediaKind } from "@/types";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { fill, t } from "@/lib/format";

export type MediaLabels = {
  upload: string;
  uploading: string;
  drop: string;
  rules: string;
  empty: string;
  copy: string;
  copied: string;
  alt: string;
  saveAlt: string;
  delete: string;
  deleteConfirm: string;
  deleteWarn: string;
  size: string;
  dimensions: string;
  uploadedBy: string;
  select: string;
  errors: { too_large: string; bad_type: string; failed: string };
  search: string;
  count: string;
  /** Selecting several files to delete them together */
  bulk: { select: string; cancel: string; selectAll: string; clear: string; selected: string; delete: string; confirm: string; warn: string; deleted: string };
  /** Shown in the picture pickers */
  imagesOnly: string;
  download: string;
  /** Switch next to "Upload": white behind pictures that have no background */
  whiteBackground: string;
  whiteBackgroundHint: string;
  /** Texts of the picture cropper (components/media/ImageCropper.tsx) */
  crop: import("./ImageCropper").ImageCropLabels;
};

const MAX_MB = 50;
/** Family of a file (same rule as lib/media/image-check.ts → kindOf) */
const kindOf = (mimeType: string): MediaKind => (mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : mimeType.startsWith("audio/") ? "audio" : mimeType === "application/pdf" ? "document" : "other");
const KIND_ICON = { video: Film, audio: Music, document: FileText, other: FileIcon } as const;
const extOf = (name: string) => /\.([A-Za-z0-9]{1,8})$/.exec(name)?.[1]?.toUpperCase() ?? "";

/** Square preview of a file: the picture itself, or an icon with the file's extension */
function Thumb({ item, className }: { item: MediaItem; className?: string }) {
  const kind = kindOf(item.mimeType);
  if (kind === "image")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.alt.ar || item.alt.en || ""} loading="lazy" className={cn("bg-[repeating-conic-gradient(#f4f1ea_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain", className)} />;
  const Icon = KIND_ICON[kind];
  return (
    <span className={cn("flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground", className)}>
      <Icon className="size-8" aria-hidden />
      <span dir="ltr" className="text-xs font-bold">
        {extOf(item.fileName)}
      </span>
    </span>
  );
}
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

export function MediaBrowser({
  labels,
  canEdit,
  onSelect,
  compact = false,
  locale,
  keepTransparent = false,
}: {
  locale: Locale;
  labels: MediaLabels;
  canEdit: boolean;
  onSelect?: (item: MediaItem) => void;
  compact?: boolean;
  /** Start with "keep see-through" on (logos, tab icon, footer divider) */
  keepTransparent?: boolean;
}) {
  // White background behind pictures uploaded with no background (switch next to "Upload"; server: lib/media/white-background.ts)
  const [whiteBg, setWhiteBg] = useState(!keepTransparent);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Picking a picture for the website (logo, slide…): other kinds of files are left out
  const imagesOnly = !!onSelect;
  // "Select" mode: tick several files, then delete them together. null = not selecting
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/media", { cache: "no-store" }).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    setItems(data?.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(files: FileList | File[]) {
    setError(null);
    setBusy(true);
    let lastId: string | null = null;
    for (const file of Array.from(files)) {
      if (imagesOnly && !file.type.startsWith("image/")) {
        setError(`${file.name}: ${labels.imagesOnly}`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`${file.name}: ${labels.errors.too_large}`);
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      if (!whiteBg) form.append("keepTransparent", "1");
      const res = await fetch("/api/media", { method: "POST", body: form }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok && data.item) lastId = data.item.id;
      else setError(`${file.name}: ${labels.errors[data.error as keyof MediaLabels["errors"]] ?? labels.errors.failed}`);
    }
    await load();
    if (lastId) setSelectedId(lastId);
    setBusy(false);
  }

  async function deletePicked() {
    if (!picked?.size) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...picked] }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) setNotice(fill(labels.bulk.deleted, { count: data.deleted ?? picked.size }));
    else setError(labels.errors.failed);
    setPicked(null);
    setConfirmBulk(false);
    setSelectedId(null);
    await load();
    setBusy(false);
  }
  const togglePicked = (id: string) =>
    setPicked((p) => {
      const next = new Set(p ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const all = (items ?? []).filter((m) => !imagesOnly || kindOf(m.mimeType) === "image");
  const visible = all.filter((m) => m.fileName.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = items?.find((m) => m.id === selectedId) ?? null;

  return (
    <div className={cn("grid gap-5", compact ? "grid-cols-1" : "lg:grid-cols-[1fr_320px]")}>
      <div
        className="flex min-w-0 flex-col gap-4"
        onDragOver={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!canEdit) return;
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            aria-label={labels.search}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <span className="text-sm text-muted-foreground">{fill(labels.count, { count: all.length })}</span>
          {/* "Select": tick several files to delete them together (library page only) */}
          {canEdit && !onSelect && all.length > 0 && picked === null && (
            <button type="button" onClick={() => (setPicked(new Set()), setNotice(null))} className="inline-flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-4 font-semibold hover:bg-muted">
              <CheckSquare className="size-4" />
              {labels.bulk.select}
            </button>
          )}
          {canEdit && (
            <>
              <input
                ref={fileInput}
                type="file"
                accept={imagesOnly ? "image/*" : undefined}
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) void upload(e.target.files);
                  e.target.value = "";
                }}
              />
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm" title={labels.whiteBackgroundHint}>
                <input type="checkbox" className="accent-[var(--gold)]" checked={whiteBg} onChange={(e) => setWhiteBg(e.target.checked)} />
                {labels.whiteBackground}
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-sidebar-active disabled:opacity-60"
              >
                <Upload className="size-4" />
                {busy ? labels.uploading : labels.upload}
              </button>
            </>
          )}
        </div>

        {/* ===== Selection bar ===== */}
        {picked !== null && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold bg-accent px-3 py-2">
            <span className="text-sm font-semibold">{fill(labels.bulk.selected, { count: picked.size })}</span>
            <button type="button" onClick={() => setPicked(new Set(visible.map((m) => m.id)))} className="h-9 rounded-lg px-3 text-sm font-semibold hover:bg-card">
              {labels.bulk.selectAll}
            </button>
            {picked.size > 0 && (
              <button type="button" onClick={() => (setPicked(new Set()), setConfirmBulk(false))} className="h-9 rounded-lg px-3 text-sm font-semibold hover:bg-card">
                {labels.bulk.clear}
              </button>
            )}
            <span className="flex-1" />
            {confirmBulk ? (
              <>
                <span className="text-sm text-destructive">{labels.bulk.warn}</span>
                <button type="button" disabled={busy} onClick={deletePicked} className="h-9 rounded-lg bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-60">
                  {fill(labels.bulk.confirm, { count: picked.size })}
                </button>
              </>
            ) : (
              <button type="button" disabled={picked.size === 0} onClick={() => setConfirmBulk(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-4 text-sm font-semibold text-white disabled:opacity-40">
                <Trash2 className="size-4" />
                {fill(labels.bulk.delete, { count: picked.size })}
              </button>
            )}
            <button type="button" onClick={() => (setPicked(null), setConfirmBulk(false))} aria-label={labels.bulk.cancel} title={labels.bulk.cancel} className="flex size-9 items-center justify-center rounded-lg hover:bg-card">
              <X className="size-4" />
            </button>
          </div>
        )}
        {notice && (
          <p role="status" className="rounded-lg bg-[var(--status-done-bg)] px-3 py-2 text-sm text-[var(--status-done-fg)]">
            {notice}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-[#e7c3bc] bg-[#f6e0dc] px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {canEdit && (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm text-muted-foreground",
              dragging ? "border-gold bg-accent" : "border-input",
            )}
          >
            <ImagePlus className="size-6 text-gold" aria-hidden />
            <span className="font-semibold text-foreground">{labels.drop}</span>
            <span>{imagesOnly ? labels.imagesOnly : fill(labels.rules, { mb: MAX_MB })}</span>
          </div>
        )}

        {items === null ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">{labels.empty}</p>
        ) : (
          <ul className={cn("grid gap-3", compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")}>
            {visible.map((m) => {
              const ticked = !!picked?.has(m.id);
              const on = picked !== null ? ticked : m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    // While selecting, a click ticks the file; otherwise it opens its details
                    onClick={() => (picked !== null ? togglePicked(m.id) : setSelectedId(m.id))}
                    aria-pressed={on}
                    className={cn("relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-start", on ? "border-gold ring-2 ring-gold/40" : "hover:border-[#c9a961]")}
                  >
                    <Thumb item={m} className="aspect-square w-full" />
                    {picked !== null && (
                      <span className={cn("absolute start-2 top-2 flex size-6 items-center justify-center rounded border-2", ticked ? "border-gold bg-gold text-gold-foreground" : "border-input bg-card")}>{ticked && <Check className="size-4" />}</span>
                    )}
                    <span dir="ltr" className="truncate px-2 py-1.5 text-xs">
                      {m.fileName}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Details of the clicked file. In a picker (compact) they open as a POP-UP, so "Use this image" is right there
          without scrolling to the end of the list; on the library page they sit beside the grid. */}
      {selected && picked === null &&
        (compact ? (
          <Dialog open onOpenChange={(open) => !open && setSelectedId(null)}>
            <DialogContent closeLabel="×" className="max-h-[92vh] max-w-md overflow-y-auto p-0">
              <DialogTitle className="sr-only">{selected.fileName}</DialogTitle>
              <DialogDescription className="sr-only">{labels.select}</DialogDescription>
              <MediaDetails
                key={selected.id}
                item={selected}
                locale={locale}
                labels={labels}
                canEdit={canEdit}
                onSelect={onSelect}
                onChanged={load}
                onDeleted={() => {
                  setSelectedId(null);
                  void load();
                }}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <MediaDetails
            key={selected.id}
            item={selected}
            locale={locale}
            labels={labels}
            canEdit={canEdit}
            onSelect={onSelect}
            onChanged={load}
            onDeleted={() => {
              setSelectedId(null);
              void load();
            }}
          />
        ))}
    </div>
  );
}

function MediaDetails({
  item,
  locale,
  labels,
  canEdit,
  onSelect,
  onChanged,
  onDeleted,
}: {
  item: MediaItem;
  locale: Locale;
  labels: MediaLabels;
  canEdit: boolean;
  onSelect?: (item: MediaItem) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveAlt() {
    setSaving(true);
    await fetch(`/api/media/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alt }) });
    setSaving(false);
    onChanged();
  }

  async function remove() {
    const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    if (res.ok) onDeleted();
  }

  return (
    <aside className="flex h-fit flex-col gap-3 rounded-xl border bg-card p-4 [[role=dialog]_&]:border-0 [[role=dialog]_&]:pt-10">
      {/* Preview: the picture, a player for video / sound, or an icon for other files */}
      {kindOf(item.mimeType) === "video" ? (
        <video src={item.url} controls preload="metadata" className="max-h-56 w-full rounded-lg bg-black" />
      ) : kindOf(item.mimeType) === "audio" ? (
        <audio src={item.url} controls preload="metadata" className="w-full" />
      ) : (
        <Thumb item={item} className={kindOf(item.mimeType) === "image" ? "max-h-56 w-full rounded-lg" : "h-32 w-full rounded-lg"} />
      )}
      <span dir="ltr" className="text-sm font-semibold break-all">
        {item.fileName}
      </span>
      <dl className="grid grid-cols-2 gap-1 text-sm">
        <dt className="text-muted-foreground">{labels.size}</dt>
        <dd dir="ltr" className="text-end">
          {kb(item.size)}
        </dd>
        {item.width && item.height && (
          <>
            <dt className="text-muted-foreground">{labels.dimensions}</dt>
            <dd dir="ltr" className="text-end">
              {item.width}×{item.height}
            </dd>
          </>
        )}
        {item.uploadedBy && (
          <>
            <dt className="text-muted-foreground">{labels.uploadedBy}</dt>
            <dd className="text-end">{t(item.uploadedBy, locale)}</dd>
          </>
        )}
      </dl>

      {onSelect && (
        <button type="button" onClick={() => onSelect(item)} className="h-11 rounded-lg bg-gold font-semibold text-gold-foreground hover:opacity-90">
          {labels.select}
        </button>
      )}

      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(item.url).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-input font-semibold hover:bg-muted"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? labels.copied : labels.copy}
      </button>
      {kindOf(item.mimeType) !== "image" && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center rounded-lg border border-input font-semibold hover:bg-muted">
          {labels.download}
        </a>
      )}

      {canEdit && (
        <>
          <div className={cn("flex flex-col gap-1.5", kindOf(item.mimeType) !== "image" && "hidden")}>
            <span className="text-sm font-semibold text-[#4a443b]">{labels.alt}</span>
            <input dir="rtl" aria-label={`${labels.alt} (AR)`} value={alt.ar} onChange={(e) => setAlt({ ...alt, ar: e.target.value })} maxLength={200} className="h-10 rounded-lg border border-input px-3 text-sm" placeholder="وصف بالعربية" />
            <input dir="ltr" aria-label={`${labels.alt} (EN)`} value={alt.en} onChange={(e) => setAlt({ ...alt, en: e.target.value })} maxLength={200} className="h-10 rounded-lg border border-input px-3 text-sm" placeholder="English description" />
            <button type="button" disabled={saving} onClick={saveAlt} className="h-10 rounded-lg border border-input text-sm font-semibold hover:bg-muted disabled:opacity-60">
              {labels.saveAlt}
            </button>
          </div>
          {confirmDelete ? (
            <div className="flex flex-col gap-2 rounded-lg bg-[#f6e0dc] p-3 text-sm text-destructive">
              <span>{labels.deleteWarn}</span>
              <button type="button" onClick={remove} className="h-10 rounded-lg bg-destructive font-semibold text-white">
                {labels.deleteConfirm}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-destructive hover:bg-[#f6e0dc]">
              <Trash2 className="size-4" />
              {labels.delete}
            </button>
          )}
        </>
      )}
    </aside>
  );
}
