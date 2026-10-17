/**
 * HERO "LAYOUT & COLOURS" — the fold-out inside each slider slide and inside the Page title block.
 * ------------------------------------------------------------------
 * Lets the client place things on the picture without touching the design:
 *   - Words: a 3 × 3 grid (right / centre / left · top / middle / bottom), title size, title and text colours
 *   - Shade over the picture: strength (0–80%) and colour, so words stay readable
 *   - Buttons: under the words, or in their own place (another 3 × 3 grid)
 *   - Each button: filled or outline, its colour and the colour of its words
 * Only what is changed is saved; everything else stays the original design.
 * <HeroShowSwitches> (same file) = the four on / off switches at the top of the form: title · text · first button · second button.
 *   - Defaults and checks: lib/hero-style.ts (same file in the storefront)
 *   - Texts: dictionaries → "sitePages.fields.hero"
 *   - How the website draws it: storefront/components/sections/HeroSlider.tsx and PageHeroSection.tsx
 */
"use client";

import type { HeroButtonStyle, HeroStyle, HeroStyleInput } from "@/types";
import { HERO_MAX_BLUR, HERO_X, HERO_Y, blurCss, heroButtonCss, overlayCss, parseHeroStyle, type HeroKind } from "@/lib/hero-style";
import { cn } from "@/lib/utils";
import { Choice, type EditorCtx } from "./fields";

type X = HeroStyle["x"];
type Y = HeroStyle["y"];
const FLEX_X = { start: "items-start text-start", center: "items-center text-center", end: "items-end text-end" } as const;
const FLEX_Y = { top: "justify-start", middle: "justify-center", bottom: "justify-end" } as const;

export function HeroStyleEditor({
  ctx,
  kind,
  value,
  onChange,
  hasImage = true,
  buttonNames,
  noButtons = false,
}: {
  ctx: EditorCtx;
  /** "slide" = a slider slide · "page" = the page title banner (their original designs differ) */
  kind: HeroKind;
  /** true = this banner has no buttons at all (a category banner): the buttons part is left out */
  noButtons?: boolean;
  value: HeroStyleInput | undefined;
  /** undefined = back to the original design */
  onChange: (v: HeroStyleInput | undefined) => void;
  /** false = no picture, so the shade is not offered */
  hasImage?: boolean;
  /** Texts of the buttons that exist (for the sketch); empty = the block has no buttons yet */
  buttonNames: string[];
}) {
  const H = ctx.labels.fields.hero;
  const st = parseHeroStyle(value, kind);
  const set = (patch: HeroStyleInput) => onChange({ ...value, ...patch });
  const setButton = (key: "button1" | "button2", patch: Partial<HeroButtonStyle>) => set({ [key]: { ...st[key], ...patch } });
  const onPicture = st.textColor || (hasImage ? "#ffffff" : "#2b2620");
  const apart = st.buttons === "own" && !(st.bx === st.x && st.by === st.y);

  const sketchButtons = buttonNames.length > 0 && (
    <span className="mt-1 flex flex-wrap gap-1">
      {buttonNames.map((name, i) => (
        <span key={i} className="rounded border px-2 py-0.5 text-[10px] font-semibold" style={heroButtonCss(i === 0 ? st.button1 : st.button2, onPicture)}>
          {name}
        </span>
      ))}
    </span>
  );

  return (
    <details className="rounded-lg border bg-muted/40 open:bg-card">
      <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold">{H.title}</summary>
      <div className="flex flex-col gap-4 border-t p-3">
        {/* Sketch: where things will sit */}
        <div className="relative aspect-[16/7] w-full max-w-md overflow-hidden rounded-lg bg-[linear-gradient(120deg,#7a6a4f,#b89b6a_55%,#4a3f30)]" style={hasImage ? undefined : { background: "#efe9dd" }}>
          {/* The pretend picture: stripes, so the blur can be seen in the sketch */}
          {hasImage && <span className="absolute inset-0 bg-[repeating-linear-gradient(115deg,#8a7650_0_14px,#c9ad78_14px_22px,#5a4c38_22px_40px)]" style={blurCss({ blur: st.blur / 3 })} />}
          {hasImage && st.overlay > 0 && <span className="absolute inset-0" style={{ background: overlayCss(st) }} />}
          <span className={cn("absolute inset-0 flex flex-col gap-0.5 p-3", FLEX_X[st.x], FLEX_Y[st.y])} style={{ color: onPicture }}>
            {st.showTitle && (
              <span className={cn("font-bold", { sm: "text-sm", md: "text-base", lg: "text-lg" }[st.titleSize])} style={{ color: st.titleColor || undefined }}>
                {H.sampleTitle}
              </span>
            )}
            {st.showText && <span className="text-[11px] opacity-90">{H.sampleText}</span>}
            {!apart && sketchButtons}
          </span>
          {apart && <span className={cn("absolute inset-0 flex flex-col p-3", FLEX_X[st.bx], FLEX_Y[st.by])}>{sketchButtons}</span>}
        </div>

        {/* ----- words ----- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PositionGrid ctx={ctx} label={H.textPosition} x={st.x} y={st.y} onPick={(x, y) => set({ x, y })} />
          <div className="flex flex-col gap-3">
            <Choice ctx={ctx} label={H.titleSize} value={st.titleSize} options={(["sm", "md", "lg"] as const).map((v) => ({ value: v, label: H.sizes[v] }))} onChange={(v) => set({ titleSize: v })} />
            <AutoColor ctx={ctx} label={H.titleColor} value={st.titleColor} start="#ffffff" onChange={(v) => set({ titleColor: v })} />
            <AutoColor ctx={ctx} label={H.textColor} value={st.textColor} start="#ffffff" onChange={(v) => set({ textColor: v })} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{H.sideHint}</p>

        {/* ----- shade over the picture ----- */}
        {hasImage && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {H.overlay}: {st.overlay}%
              <input type="range" min={0} max={80} step={5} value={st.overlay} disabled={ctx.disabled} onChange={(e) => set({ overlay: Number(e.target.value) })} className="accent-[var(--gold)]" />
              <span className="text-xs font-normal text-muted-foreground">{H.overlayHint}</span>
            </label>
            <AutoColor ctx={ctx} label={H.overlayColor} value={st.overlayColor} start="#000000" onChange={(v) => set({ overlayColor: v })} />
            {/* ----- blur of the picture: 0 = sharp ----- */}
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {H.blur}: {st.blur === 0 ? H.blurOff : st.blur}
              <input type="range" min={0} max={HERO_MAX_BLUR} step={1} value={st.blur} disabled={ctx.disabled} onChange={(e) => set({ blur: Number(e.target.value) })} className="accent-[var(--gold)]" />
              <span className="text-xs font-normal text-muted-foreground">{H.blurHint}</span>
            </label>
          </div>
        )}

        {/* ----- buttons ----- */}
        {noButtons ? null : buttonNames.length === 0 ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{H.noButtons}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice
                ctx={ctx}
                label={H.buttonsPlace}
                value={st.buttons}
                options={[
                  { value: "text", label: H.buttonsWithText },
                  { value: "own", label: H.buttonsOwn },
                ]}
                onChange={(v) => set({ buttons: v })}
              />
              {st.buttons === "own" && <PositionGrid ctx={ctx} label={H.buttonsPosition} x={st.bx} y={st.by} onPick={(bx, by) => set({ bx, by })} />}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["button1", "button2"] as const).slice(0, Math.max(1, buttonNames.length)).map((key, i) => (
                <fieldset key={key} className="flex flex-col gap-3 rounded-lg border p-3">
                  <legend className="px-1 text-sm font-semibold">{i === 0 ? H.button1 : H.button2}</legend>
                  <Choice
                    ctx={ctx}
                    label={H.buttonLook}
                    value={st[key].variant}
                    options={[
                      { value: "filled", label: H.filled },
                      { value: "outline", label: H.outline },
                    ]}
                    onChange={(v) => setButton(key, { variant: v })}
                  />
                  <AutoColor ctx={ctx} label={H.buttonColor} value={st[key].color} start="#b8975a" onChange={(v) => setButton(key, { color: v })} />
                  <AutoColor ctx={ctx} label={H.buttonTextColor} value={st[key].textColor} start="#ffffff" onChange={(v) => setButton(key, { textColor: v })} />
                </fieldset>
              ))}
            </div>
          </>
        )}

        {value && !ctx.disabled && (
          <button type="button" onClick={() => onChange(undefined)} className="self-start rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
            {H.reset}
          </button>
        )}
      </div>
    </details>
  );
}

/**
 * WHAT SHOWS — four switches: title, text, first button, second button.
 * Off = hidden on the website and its box disappears from the form; what was typed is kept for when it is switched back on.
 */
export function HeroShowSwitches({ ctx, value, onChange, parts: only }: { ctx: EditorCtx; value: HeroStyleInput | undefined; onChange: (v: HeroStyleInput) => void; /** Leave out the buttons where there are none (category banner) */ parts?: ("showTitle" | "showText" | "showButton1" | "showButton2")[] }) {
  const H = ctx.labels.fields.hero;
  const parts = [
    ["showTitle", H.showTitle],
    ["showText", H.showText],
    ["showButton1", H.button1],
    ["showButton2", H.button2],
  ] as const;
  const shown = parts.filter(([key]) => !only || only.includes(key));
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <legend className="px-1 text-sm font-semibold">{H.showTitleGroup}</legend>
      <div className="flex flex-wrap gap-2">
        {shown.map(([key, label]) => {
          const on = value?.[key] !== false;
          return (
            <button
              key={key}
              type="button"
              role="switch"
              aria-checked={on}
              disabled={ctx.disabled}
              onClick={() => onChange({ ...value, [key]: !on })}
              className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm", on ? "border-gold bg-accent font-semibold" : "border-input bg-card text-muted-foreground line-through")}
            >
              <span className={cn("size-2.5 rounded-full", on ? "bg-gold" : "bg-muted-foreground/40")} />
              {label}
            </button>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground">{H.showHint}</span>
    </fieldset>
  );
}

/** 3 × 3 grid: click a cell to put the words / buttons there */
function PositionGrid({ ctx, label, x, y, onPick }: { ctx: EditorCtx; label: string; x: X; y: Y; onPick: (x: X, y: Y) => void }) {
  const H = ctx.labels.fields.hero;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid w-36 grid-cols-3 gap-1 rounded-lg border bg-card p-1">
        {HERO_Y.map((row) =>
          HERO_X.map((col) => {
            const on = row === y && col === x;
            return (
              <button
                key={`${row}-${col}`}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${H.rows[row]} · ${H.cols[col]}`}
                title={`${H.rows[row]} · ${H.cols[col]}`}
                disabled={ctx.disabled}
                onClick={() => onPick(col, row)}
                className={cn("flex h-9 items-center justify-center rounded", on ? "bg-primary" : "bg-muted hover:bg-accent")}
              >
                <span className={cn("size-2 rounded-full", on ? "bg-primary-foreground" : "bg-muted-foreground/40")} />
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

/** A colour that can stay "automatic" (saved as ""): tick to choose your own */
function AutoColor({ ctx, label, value, start, onChange }: { ctx: EditorCtx; label: string; value: string; start: string; onChange: (v: string) => void }) {
  const H = ctx.labels.fields.hero;
  return (
    <label className="flex min-h-9 flex-wrap items-center gap-2 text-sm">
      <input type="checkbox" checked={value !== ""} disabled={ctx.disabled} onChange={(e) => onChange(e.target.checked ? start : "")} className="size-4 accent-[var(--gold)]" />
      <span className="font-semibold">{label}</span>
      {value === "" ? (
        <span className="text-xs text-muted-foreground">{H.auto}</span>
      ) : (
        <>
          <input type="color" aria-label={label} value={value} disabled={ctx.disabled} onChange={(e) => onChange(e.target.value)} className="size-8 cursor-pointer rounded border border-input bg-card p-0.5" />
          <span dir="ltr" className="font-mono text-xs text-muted-foreground">
            {value}
          </span>
        </>
      )}
    </label>
  );
}
