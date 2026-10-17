/**
 * IMAGE FIELD in the theme editor (logo, favicon, share image…):
 * shows the current image, "Choose from library" opens the media library in a side panel,
 * or a link can be pasted. Relative paths ("/clients/demo/logo.svg") are shown from the storefront.
 * With `crop` (the logos): after choosing a picture the LOGO CROPPER opens (LogoCropper.tsx) so the designer
 * chooses exactly which part fills the frame — and "Adjust" re-opens it for the current logo.
 * With `frame` (every other website picture): the picture has ONE fixed shape (config/image-frames.ts). After choosing
 * a picture the IMAGE CROPPER opens (components/media/ImageCropper.tsx) to crop or fit it into that shape, and the
 * "paste a link" box is hidden — so a picture can never reach the website in the wrong shape.
 */
"use client";

import { useState } from "react";
import type { Locale } from "@/types";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MediaBrowser, type MediaLabels } from "@/components/media/MediaBrowser";
import { Crop } from "lucide-react";
import { Field } from "./fields";
import { LogoCropper, type CropperLabels, type LogoShape } from "./LogoCropper";
import { ImageCropper } from "@/components/media/ImageCropper";
import { IMAGE_FRAMES, ratioName, type FrameKey } from "@/config/image-frames";
import { fill } from "@/lib/format";

export interface CropOptions {
  shape: LogoShape;
  canChangeShape?: boolean;
  onShapeChange?: (shape: LogoShape) => void;
  preview: { background: string; foreground: string; name: string };
  labels: CropperLabels & { adjust: string };
}

export function ImageField({
  label,
  hint,
  value,
  onChange,
  storefrontUrl,
  labels,
  mediaLabels,
  disabled,
  required,
  locale,
  crop,
  frame,
}: {
  locale: Locale;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  storefrontUrl: string;
  labels: { choose: string; change: string; remove: string; or: string; none: string };
  mediaLabels: MediaLabels;
  disabled?: boolean;
  required?: boolean;
  crop?: CropOptions;
  /** Fixed shape of this picture on the website (a name from config/image-frames.ts) */
  frame?: FrameKey;
}) {
  const [open, setOpen] = useState(false);
  /** Picture waiting in the cropper (null = cropper closed) */
  const [cropping, setCropping] = useState<{ src: string; original: string } | null>(null);
  const full = (v: string) => (v.startsWith("/") ? `${storefrontUrl}${v}` : v);
  const src = full(value);
  const shape = frame ? IMAGE_FRAMES[frame] : null;
  const C = mediaLabels.crop;

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        {/* With a fixed shape the small preview has that shape too */}
        <div
          className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[repeating-conic-gradient(#f4f1ea_0_25%,#fff_0_50%)] bg-[length:14px_14px]"
          style={shape ? { width: Math.round(Math.min(112, (72 * shape.w) / shape.h)), height: Math.round(Math.min(72, (112 * shape.h) / shape.w)) } : undefined}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">{labels.none}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpen(true)}
              className="h-10 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              {value ? labels.change : labels.choose}
            </button>
            {value && shape && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setCropping({ src, original: value })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <Crop className="size-4" />
                {C.adjust}
              </button>
            )}
            {value && crop && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setCropping({ src, original: value })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <Crop className="size-4" />
                {crop.labels.adjust}
              </button>
            )}
            {value && !required && (
              <button type="button" disabled={disabled} onClick={() => onChange("")} className="h-10 rounded-lg px-3 text-sm text-destructive hover:bg-[#f6e0dc] disabled:opacity-60">
                {labels.remove}
              </button>
            )}
          </div>
          {shape ? (
            // Fixed shape: no link box (a pasted link would skip the cropper)
            <span className="text-xs text-muted-foreground">{fill(C.fixed, { ratio: ratioName(shape), w: shape.w, h: shape.h })}</span>
          ) : (
            <input
              dir="ltr"
              aria-label={`${label} — ${labels.or}`}
              placeholder={labels.or}
              value={value}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value.trim())}
              className="h-9 w-full rounded-md border border-input bg-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="end" closeLabel="×" className="w-[95%] max-w-3xl gap-4 overflow-y-auto p-5">
          <SheetTitle>{label}</SheetTitle>
          {open && (
            <MediaBrowser
              labels={mediaLabels}
              locale={locale}
              canEdit
              compact
              // Logos, the tab icon, the footer divider: keep their see-through background
              keepTransparent={!!crop || frame === "favicon" || frame === "footerDivider"}
              onSelect={(item) => {
                setOpen(false);
                if (crop || shape) setCropping({ src: full(item.url), original: item.url });
                else onChange(item.url);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
      {crop && (
        <LogoCropper
          open={cropping !== null}
          onOpenChange={(v) => !v && setCropping(null)}
          src={cropping?.src ?? ""}
          shape={crop.shape}
          canChangeShape={crop.canChangeShape}
          preview={crop.preview}
          labels={crop.labels}
          onDone={(url, shape) => {
            // "Use as it is" gives back the same picture → keep its original address (e.g. "/clients/demo/logo.svg")
            onChange(url === cropping?.src ? cropping.original : url);
            crop.onShapeChange?.(shape);
          }}
        />
      )}
      {shape && <ImageCropper open={cropping !== null} onOpenChange={(v) => !v && setCropping(null)} src={cropping?.src ?? ""} frame={shape} labels={C} onDone={onChange} />}
    </Field>
  );
}
