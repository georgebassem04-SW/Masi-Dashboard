/**
 * LOGO CROPPER — like choosing a WhatsApp profile picture: the frame stays still, you move and zoom the picture
 * under it until the right part is inside, then "Save". The result is a NEW image (PNG, transparency kept)
 * saved in the media library, so the website shows exactly what was inside the frame.
 *
 *   - Frame shapes: "square" (icon only, the store name is written next to it on the website)
 *                   "wide"   (logo that already contains the name — the website hides the written name)
 *   - Move: drag with the mouse / finger, or the arrow keys · Zoom: the slider, the mouse wheel, or + / −
 *   - "Fit whole picture" shows all of it inside the frame; "Fill the frame" zooms until there is no empty space
 *
 * Where to edit:
 *   - Frame sizes on screen      -> FRAME below
 *   - Size of the saved image    -> OUTPUT below (bigger = sharper, heavier)
 *   - Texts                      -> dictionaries → "theme.cropper"
 * Saves through POST /api/media (same rules as any upload).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type LogoShape = "square" | "wide";

/** Frame size on screen (px) */
const FRAME: Record<LogoShape, { w: number; h: number }> = { square: { w: 240, h: 240 }, wide: { w: 330, h: 110 } };
/** Size of the saved image (px) */
const OUTPUT: Record<LogoShape, { w: number; h: number }> = { square: { w: 512, h: 512 }, wide: { w: 960, h: 320 } };
/** How far you can zoom in, compared with "fill the frame" */
const MAX_ZOOM = 6;

export interface CropperLabels {
  title: string;
  hint: string;
  shape: string;
  shapes: Record<LogoShape, string>;
  shapeHints: Record<LogoShape, string>;
  zoom: string;
  fit: string;
  fill: string;
  preview: string;
  save: string;
  saving: string;
  cancel: string;
  useAsIs: string;
  loadError: string;
  saveError: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Picture to crop (address the browser can load) */
  src: string;
  shape: LogoShape;
  /** false = the shape is fixed (e.g. the dark-background logo follows the main logo) */
  canChangeShape?: boolean;
  /** For the small "how it looks" preview */
  preview: { background: string; foreground: string; name: string };
  labels: CropperLabels;
  /** Called with the new image address (or the original when "use as it is") and the chosen shape */
  onDone: (url: string, shape: LogoShape) => void;
}

type Img = { el: HTMLImageElement; w: number; h: number };

export function LogoCropper({ open, onOpenChange, src, shape: startShape, canChangeShape = true, preview, labels: L, onDone }: Props) {
  const [shape, setShape] = useState<LogoShape>(startShape);
  const [img, setImg] = useState<Img | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // picture centre, relative to the frame centre (screen px)
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  const frame = FRAME[shape];
  const fitZoom = img ? Math.min(frame.w / img.w, frame.h / img.h) : 1;
  const fillZoom = img ? Math.max(frame.w / img.w, frame.h / img.h) : 1;
  const minZoom = fitZoom;
  const maxZoom = fillZoom * MAX_ZOOM;

  // Load the picture (crossOrigin so it can be drawn into the saved image)
  useEffect(() => {
    if (!open) return;
    setShape(startShape);
    setImg(null);
    setFailed(false);
    setSaveError(false);
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = () => setFailed(true);
    el.src = src;
  }, [open, src, startShape]);

  // New picture or new frame shape → start from "fill the frame", centred
  useEffect(() => {
    if (!img) return;
    setZoom(Math.max(FRAME[shape].w / img.w, FRAME[shape].h / img.h));
    setPos({ x: 0, y: 0 });
  }, [img, shape]);

  /** Keeps the picture where it makes sense: covering the frame when bigger, inside it when smaller */
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    if (!img) return p;
    const lim = (size: number, box: number) => Math.abs(size - box) / 2;
    const lx = lim(img.w * z, frame.w);
    const ly = lim(img.h * z, frame.h);
    return { x: Math.max(-lx, Math.min(lx, p.x)), y: Math.max(-ly, Math.min(ly, p.y)) };
  };

  const setZoomTo = (z: number) => {
    const next = Math.max(minZoom, Math.min(maxZoom, z));
    // keep the same point in the middle of the frame while zooming
    const k = next / zoom;
    setZoom(next);
    setPos((p) => clamp({ x: p.x * k, y: p.y * k }, next));
  };

  // Slider works on a log scale so zooming feels even
  const toSlider = (z: number) => (maxZoom === minZoom ? 0 : Math.log(z / minZoom) / Math.log(maxZoom / minZoom));
  const fromSlider = (t: number) => minZoom * Math.pow(maxZoom / minZoom, t);

  async function save() {
    if (!img) return;
    setBusy(true);
    setSaveError(false);
    try {
      const out = OUTPUT[shape];
      const k = out.w / frame.w;
      const canvas = document.createElement("canvas");
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      const w = img.w * zoom;
      const h = img.h * zoom;
      const left = frame.w / 2 + pos.x - w / 2;
      const top = frame.h / 2 + pos.y - h / 2;
      ctx.drawImage(img.el, left * k, top * k, w * k, h * k);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no image");
      const form = new FormData();
      form.append("file", new File([blob], `logo-${shape}.png`, { type: "image/png" }));
      // Logos stay see-through (no white background added)
      form.append("keepTransparent", "1");
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.item?.url) throw new Error("upload failed");
      onDone(data.item.url, shape);
      onOpenChange(false);
    } catch {
      // e.g. a picture from another website that doesn't allow being copied
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  const imgStyle = img
    ? {
        width: img.w * zoom,
        height: img.h * zoom,
        left: frame.w / 2 + pos.x - (img.w * zoom) / 2,
        top: frame.h / 2 + pos.y - (img.h * zoom) / 2,
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={L.cancel} className="max-w-lg">
        <DialogTitle>{L.title}</DialogTitle>
        <DialogDescription>{L.hint}</DialogDescription>

        {/* Frame shape */}
        {canChangeShape && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{L.shape}</span>
            <div role="radiogroup" aria-label={L.shape} className="flex gap-1 self-start rounded-lg bg-muted p-1">
              {(["square", "wide"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={shape === s}
                  onClick={() => setShape(s)}
                  className={cn("flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold", shape === s ? "bg-card shadow-sm" : "text-muted-foreground")}
                >
                  <span aria-hidden className={cn("inline-block border-2 border-current", s === "square" ? "size-3.5" : "h-3 w-7")} />
                  {L.shapes[s]}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{L.shapeHints[shape]}</span>
          </div>
        )}

        {/* The frame: the picture moves under it; outside the frame is dimmed */}
        <div className="flex justify-center overflow-hidden rounded-xl bg-[#2b2620] p-6">
          <div
            role="application"
            aria-label={L.title}
            tabIndex={0}
            className="relative cursor-grab touch-none outline-none select-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
            style={{ width: frame.w, height: frame.h }}
            onPointerDown={(e) => {
              if (!img) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.id !== e.pointerId) return;
              setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onWheel={(e) => setZoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 20 : 5;
              const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              if (moves[e.key]) {
                e.preventDefault();
                setPos((p) => clamp({ x: p.x + moves[e.key][0], y: p.y + moves[e.key][1] }));
              } else if (e.key === "+" || e.key === "=") setZoomTo(zoom * 1.1);
              else if (e.key === "-") setZoomTo(zoom / 1.1);
            }}
          >
            {/* Checkerboard = transparent parts of the logo */}
            <div className="absolute inset-0 bg-[repeating-conic-gradient(#e9e4da_0_25%,#fff_0_50%)] bg-[length:16px_16px]" />
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.el.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={imgStyle} crossOrigin="anonymous" />
            )}
            {/* Dim everything outside the frame (a huge shadow, cut off by the dark box around it) + the frame line */}
            <div className="pointer-events-none absolute inset-0 rounded-sm shadow-[0_0_0_9999px_rgba(43,38,32,0.72)] ring-2 ring-white" />
            {!img && !failed && <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-white" />}
            {failed && <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-semibold text-white">{L.loadError}</p>}
          </div>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setZoomTo(zoom / 1.15)} disabled={!img} aria-label={`${L.zoom} −`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40">
            <ZoomOut className="size-4" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={img ? toSlider(zoom) : 0}
            disabled={!img}
            aria-label={L.zoom}
            onChange={(e) => setZoomTo(fromSlider(Number(e.target.value)))}
            className="h-2 flex-1 accent-gold"
          />
          <button type="button" onClick={() => setZoomTo(zoom * 1.15)} disabled={!img} aria-label={`${L.zoom} +`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40">
            <ZoomIn className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!img} onClick={() => {
              setZoom(fitZoom);
              setPos({ x: 0, y: 0 });
            }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">
            <Minimize2 className="size-4" />
            {L.fit}
          </button>
          <button type="button" disabled={!img} onClick={() => {
              setZoom(fillZoom);
              setPos({ x: 0, y: 0 });
            }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40">
            <Maximize2 className="size-4" />
            {L.fill}
          </button>
        </div>

        {/* How it will look in the website's top bar */}
        {img && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">{L.preview}</span>
            <div className="flex h-14 items-center gap-2 overflow-hidden rounded-lg px-4" style={{ background: preview.background, color: preview.foreground }}>
              <span className="relative shrink-0 overflow-hidden" style={shape === "square" ? { width: 36, height: 36 } : { width: 120, height: 40 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.el.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={(() => {
                    const s = (shape === "square" ? 36 : 120) / frame.w;
                    return { width: img.w * zoom * s, height: img.h * zoom * s, left: (frame.w / 2 + pos.x - (img.w * zoom) / 2) * s, top: (frame.h / 2 + pos.y - (img.h * zoom) / 2) * s };
                  })()}
                />
              </span>
              {shape === "square" && <span className="truncate text-lg font-bold">{preview.name}</span>}
            </div>
          </div>
        )}

        {saveError && (
          <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm font-semibold text-destructive">
            {L.saveError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <button
            type="button"
            onClick={() => {
              onDone(src, shape);
              onOpenChange(false);
            }}
            className="me-auto h-10 rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            {L.useAsIs}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-lg border border-input px-4 text-sm font-semibold hover:bg-muted">
            {L.cancel}
          </button>
          <button type="button" onClick={save} disabled={!img || busy} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? L.saving : L.save}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
