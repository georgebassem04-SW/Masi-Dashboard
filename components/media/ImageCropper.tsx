/**
 * IMAGE CROPPER — every website picture is chosen through this, so it always has the right shape.
 * ------------------------------------------------------------------
 * The frame has the FIXED shape of the place where the picture goes (config/image-frames.ts) and cannot be changed.
 * Under it the person:
 *   - "Fill the frame" (crop)  -> the picture covers the frame; drag to choose which part shows, zoom in for less
 *   - "Fit whole picture"      -> all of the picture shows; the empty space gets a background colour
 *   - anything in between with the zoom slider / mouse wheel / + and −, move with drag or the arrow keys
 * "Save" makes a NEW picture of exactly the frame's size and puts it in the media library (the original stays there).
 *
 * Where to edit:
 *   - Shapes and saved sizes       -> config/image-frames.ts
 *   - Largest frame on screen      -> SCREEN below
 *   - Background colours offered   -> BACKGROUNDS below
 *   - Texts                        -> dictionaries → "media.crop"
 * (The logo has its own cropper with two shapes: components/theme/LogoCropper.tsx)
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ratioName, type ImageFrame } from "@/config/image-frames";
import { fill } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Largest frame drawn on screen (px); the frame keeps its shape inside this box */
const SCREEN = { w: 440, h: 300 };
/** How far you can zoom in, compared with "fill the frame" */
const MAX_ZOOM = 5;
/** Colours for the empty space when the whole picture is fitted */
const BACKGROUNDS = ["#ffffff", "#f4f1ea", "#000000"];

export interface ImageCropLabels {
  adjust: string;
  title: string;
  hint: string;
  /** "Shape on the website: {ratio} · saved as {w} × {h}" */
  size: string;
  /** Under the picture in a form: "Fixed shape {ratio}" */
  fixed: string;
  zoom: string;
  fit: string;
  fill: string;
  background: string;
  transparent: string;
  customColor: string;
  small: string;
  save: string;
  saving: string;
  cancel: string;
  loadError: string;
  saveError: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Picture to crop (address the browser can load) */
  src: string;
  frame: ImageFrame;
  labels: ImageCropLabels;
  /** Called with the address of the new picture */
  onDone: (url: string) => void;
}

type Img = { el: HTMLImageElement; w: number; h: number };

export function ImageCropper({ open, onOpenChange, src, frame: out, labels: L, onDone }: Props) {
  const [img, setImg] = useState<Img | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // picture centre, relative to the frame centre (screen px)
  const [background, setBackground] = useState<string>(out.transparent ? "transparent" : BACKGROUNDS[0]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  // Frame on screen: the saved shape, as big as fits in SCREEN
  const k = Math.min(SCREEN.w / out.w, SCREEN.h / out.h);
  const frame = { w: Math.round(out.w * k), h: Math.round(out.h * k) };
  const fitZoom = img ? Math.min(frame.w / img.w, frame.h / img.h) : 1;
  const fillZoom = img ? Math.max(frame.w / img.w, frame.h / img.h) : 1;
  const maxZoom = fillZoom * MAX_ZOOM;
  // Empty space around the picture? (then the background colour matters)
  const hasGaps = !!img && (img.w * zoom < frame.w - 0.5 || img.h * zoom < frame.h - 0.5);

  // Load the picture (crossOrigin so it can be drawn into the saved image)
  useEffect(() => {
    if (!open) return;
    setImg(null);
    setFailed(false);
    setSaveError(false);
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight });
    el.onerror = () => setFailed(true);
    el.src = src;
  }, [open, src]);

  // New picture → start from "fill the frame", centred
  useEffect(() => {
    if (!img) return;
    setZoom(Math.max(frame.w / img.w, frame.h / img.h));
    setPos({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  /** Keeps the picture where it makes sense: covering the frame when bigger, inside it when smaller */
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    if (!img) return p;
    const lim = (size: number, box: number) => Math.abs(size - box) / 2;
    const lx = lim(img.w * z, frame.w);
    const ly = lim(img.h * z, frame.h);
    return { x: Math.max(-lx, Math.min(lx, p.x)), y: Math.max(-ly, Math.min(ly, p.y)) };
  };
  const setZoomTo = (z: number) => {
    const next = Math.max(fitZoom, Math.min(maxZoom, z));
    const ratio = next / zoom; // keep the same point in the middle of the frame while zooming
    setZoom(next);
    setPos((p) => clamp({ x: p.x * ratio, y: p.y * ratio }, next));
  };
  // Slider works on a log scale so zooming feels even
  const toSlider = (z: number) => (maxZoom === fitZoom ? 0 : Math.log(z / fitZoom) / Math.log(maxZoom / fitZoom));
  const fromSlider = (t: number) => fitZoom * Math.pow(maxZoom / fitZoom, t);

  async function save() {
    if (!img) return;
    setBusy(true);
    setSaveError(false);
    try {
      const s = out.w / frame.w; // screen → saved picture
      const canvas = document.createElement("canvas");
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      const clear = background === "transparent";
      if (!clear) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, out.w, out.h);
      }
      const w = img.w * zoom;
      const h = img.h * zoom;
      ctx.drawImage(img.el, (frame.w / 2 + pos.x - w / 2) * s, (frame.h / 2 + pos.y - h / 2) * s, w * s, h * s);
      // Photos are saved as JPEG (small file); PNG only when the empty space must stay see-through
      const type = clear ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
      if (!blob) throw new Error("no image");
      const form = new FormData();
      form.append("file", new File([blob], `image-${out.w}x${out.h}.${clear ? "png" : "jpg"}`, { type }));
      // "See-through" chosen: keep it (otherwise the media library puts white behind see-through pictures)
      if (clear) form.append("keepTransparent", "1");
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.item?.url) throw new Error("upload failed");
      onDone(data.item.url);
      onOpenChange(false);
    } catch {
      // e.g. a picture from another website that doesn't allow being copied
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }

  // Picture much smaller than the saved size → it will look soft; tell the person
  const small = !!img && zoom * (out.w / frame.w) > 1.6;
  const swatch = "size-8 rounded-full border-2 outline-none focus-visible:ring-2 focus-visible:ring-gold";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={L.cancel} className="max-h-[94vh] max-w-xl overflow-y-auto">
        <DialogTitle>{L.title}</DialogTitle>
        <DialogDescription>{L.hint}</DialogDescription>
        <p className="-mt-2 text-xs font-semibold text-muted-foreground">{fill(L.size, { ratio: ratioName(out), w: out.w, h: out.h })}</p>

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
            {/* Empty space: the chosen colour, or a checkerboard for "see-through" */}
            <div
              className={cn("absolute inset-0", background === "transparent" && "bg-[repeating-conic-gradient(#e9e4da_0_25%,#fff_0_50%)] bg-[length:16px_16px]")}
              style={background === "transparent" ? undefined : { background }}
            />
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.el.src}
                alt=""
                draggable={false}
                crossOrigin="anonymous"
                className="pointer-events-none absolute max-w-none"
                style={{ width: img.w * zoom, height: img.h * zoom, left: frame.w / 2 + pos.x - (img.w * zoom) / 2, top: frame.h / 2 + pos.y - (img.h * zoom) / 2 }}
              />
            )}
            {/* Dim everything outside the frame (a huge shadow, cut off by the dark box around it) + the frame line */}
            <div className="pointer-events-none absolute inset-0 rounded-sm shadow-[0_0_0_9999px_rgba(43,38,32,0.72)] ring-2 ring-white" />
            {!img && !failed && <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-white" />}
            {failed && <p className="absolute inset-0 flex items-center justify-center bg-[#2b2620] p-4 text-center text-sm font-semibold text-white">{L.loadError}</p>}
          </div>
        </div>

        {/* Crop or fit */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!img}
            onClick={() => {
              setZoom(fillZoom);
              setPos({ x: 0, y: 0 });
            }}
            className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40", !hasGaps ? "border-gold bg-accent" : "border-input")}
          >
            <Maximize2 className="size-4" />
            {L.fill}
          </button>
          <button
            type="button"
            disabled={!img}
            onClick={() => {
              setZoom(fitZoom);
              setPos({ x: 0, y: 0 });
            }}
            className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40", hasGaps ? "border-gold bg-accent" : "border-input")}
          >
            <Minimize2 className="size-4" />
            {L.fit}
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setZoomTo(zoom / 1.15)} disabled={!img} aria-label={`${L.zoom} −`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40">
            <ZoomOut className="size-4" />
          </button>
          <input type="range" min={0} max={1} step={0.001} value={img ? toSlider(zoom) : 0} disabled={!img} aria-label={L.zoom} onChange={(e) => setZoomTo(fromSlider(Number(e.target.value)))} className="h-2 flex-1 accent-gold" />
          <button type="button" onClick={() => setZoomTo(zoom * 1.15)} disabled={!img} aria-label={`${L.zoom} +`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40">
            <ZoomIn className="size-4" />
          </button>
        </div>

        {/* Background colour — only matters while there is empty space around the picture */}
        {hasGaps && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{L.background}</span>
            {out.transparent && (
              <button type="button" aria-label={L.transparent} title={L.transparent} aria-pressed={background === "transparent"} onClick={() => setBackground("transparent")} className={cn(swatch, "bg-[repeating-conic-gradient(#d9d3c7_0_25%,#fff_0_50%)] bg-[length:10px_10px]", background === "transparent" ? "border-gold" : "border-input")} />
            )}
            {BACKGROUNDS.map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={background === c} onClick={() => setBackground(c)} className={cn(swatch, background === c ? "border-gold" : "border-input")} style={{ background: c }} />
            ))}
            <label className="flex items-center gap-1.5 text-sm">
              <input type="color" aria-label={L.customColor} value={/^#[0-9a-f]{6}$/i.test(background) ? background : "#ffffff"} onChange={(e) => setBackground(e.target.value)} className="size-8 cursor-pointer rounded border border-input bg-card p-0.5" />
              {L.customColor}
            </label>
          </div>
        )}

        {small && <p className="rounded-lg bg-accent px-3 py-2 text-xs">{L.small}</p>}
        {saveError && (
          <p role="alert" className="rounded-lg bg-[#f6e0dc] px-3 py-2 text-sm font-semibold text-destructive">
            {L.saveError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
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
