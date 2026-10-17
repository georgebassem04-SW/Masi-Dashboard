/**
 * HERO LAYOUT — defaults + safety checks for "where the words and buttons sit, and their colours".
 * ------------------------------------------------------------------
 * The SAME file exists in the dashboard and the storefront (lib/hero-style.ts) — keep both identical.
 * Edited in the dashboard page editor (Main slider → each slide, and Page title) with
 * components/pages/HeroStyleEditor.tsx; drawn by the storefront's HeroSlider.tsx and PageHeroSection.tsx.
 *
 *   HERO_DEFAULTS.slide  -> the original slider design  (words on the reading-start side, middle, shade 40%)
 *   HERO_DEFAULTS.page   -> the original page title     (words in the centre, shade 50%)
 *   HERO_DEFAULTS.category -> the original category banner (words on the reading-start side, shade 50%)
 *   Blur: 0 in every default (sharp picture); the slider goes up to HERO_MAX_BLUR
 *   parseHeroStyle(saved, kind) -> a complete, safe style: anything missing or wrong falls back to the default
 */
import type { HeroButtonStyle, HeroStyle } from "@/types";

export const HERO_X = ["start", "center", "end"] as const;
export const HERO_Y = ["top", "middle", "bottom"] as const;
/** The strongest blur the dashboard slider allows (pixels) */
export const HERO_MAX_BLUR = 20;

const BUTTON1: HeroButtonStyle = { variant: "filled", color: "", textColor: "" };
const BUTTON2: HeroButtonStyle = { variant: "outline", color: "", textColor: "" };

/** "slide" = slider slide · "page" = page title banner · "category" = the banner of a category page */
export type HeroKind = "slide" | "page" | "category";
export const HERO_DEFAULTS: Record<HeroKind, HeroStyle> = {
  slide: { showTitle: true, showText: true, showButton1: true, showButton2: true, x: "start", y: "middle", buttons: "text", bx: "center", by: "bottom", titleSize: "md", titleColor: "", textColor: "", overlay: 40, overlayColor: "", blur: 0, button1: BUTTON1, button2: BUTTON2 },
  category: { showTitle: true, showText: true, showButton1: true, showButton2: true, x: "start", y: "middle", buttons: "text", bx: "center", by: "bottom", titleSize: "md", titleColor: "", textColor: "", overlay: 50, overlayColor: "", blur: 0, button1: BUTTON1, button2: BUTTON2 },
  page: { showTitle: true, showText: true, showButton1: true, showButton2: true, x: "center", y: "middle", buttons: "text", bx: "center", by: "bottom", titleSize: "md", titleColor: "", textColor: "", overlay: 50, overlayColor: "", blur: 0, button1: BUTTON1, button2: BUTTON2 },
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
/** "" (automatic) or #RRGGBB */
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : "");
const button = (v: unknown, d: HeroButtonStyle): HeroButtonStyle => {
  const b = obj(v);
  return { variant: oneOf(b.variant, ["filled", "outline"] as const, d.variant), color: color(b.color), textColor: color(b.textColor) };
};

export function parseHeroStyle(input: unknown, kind: HeroKind): HeroStyle {
  const s = obj(input);
  const d = HERO_DEFAULTS[kind];
  const bool = (v: unknown) => v !== false; // only an explicit "off" hides a part
  return {
    showTitle: bool(s.showTitle),
    showText: bool(s.showText),
    showButton1: bool(s.showButton1),
    showButton2: bool(s.showButton2),
    x: oneOf(s.x, HERO_X, d.x),
    y: oneOf(s.y, HERO_Y, d.y),
    buttons: oneOf(s.buttons, ["text", "own"] as const, d.buttons),
    bx: oneOf(s.bx, HERO_X, d.bx),
    by: oneOf(s.by, HERO_Y, d.by),
    titleSize: oneOf(s.titleSize, ["sm", "md", "lg"] as const, d.titleSize),
    titleColor: color(s.titleColor),
    textColor: color(s.textColor),
    overlay: typeof s.overlay === "number" && s.overlay >= 0 && s.overlay <= 80 ? Math.round(s.overlay) : d.overlay,
    overlayColor: color(s.overlayColor),
    blur: typeof s.blur === "number" && s.blur >= 0 && s.blur <= HERO_MAX_BLUR ? Math.round(s.blur) : d.blur,
    button1: button(s.button1, d.button1),
    button2: button(s.button2, d.button2),
  };
}

/**
 * Blur of the hero picture as inline CSS (nothing when the blur is 0).
 * The picture is also made a little bigger so its soft edges stay outside the banner.
 */
export function blurCss(style: Pick<HeroStyle, "blur">): { filter: string; transform: string } | undefined {
  return style.blur > 0 ? { filter: `blur(${style.blur}px)`, transform: `scale(${(1 + style.blur / 100).toFixed(2)})` } : undefined;
}

/** Shade over the picture as a CSS colour, e.g. overlay 40 + "" → "rgba(0,0,0,0.4)" */
export function overlayCss(style: Pick<HeroStyle, "overlay" | "overlayColor">): string {
  const n = parseInt((style.overlayColor || "#000000").slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${style.overlay / 100})`;
}

/**
 * Colours of one hero button as inline CSS. Automatic colours:
 *   filled  -> the site's main colour with its own text colour
 *   outline -> border and words in the hero's text colour (`onPicture`, usually white), filled on hover by the browser default
 */
export function heroButtonCss(b: HeroButtonStyle, onPicture: string): { background: string; color: string; borderColor: string } {
  if (b.variant === "filled") {
    const bg = b.color || "var(--primary)";
    return { background: bg, color: b.textColor || (b.color ? readable(b.color) : "var(--primary-foreground)"), borderColor: bg };
  }
  const line = b.color || onPicture;
  return { background: "transparent", color: b.textColor || line, borderColor: line };
}

/** White or near-black, whichever is easier to read on this colour */
function readable(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1a1a1a" : "#ffffff";
}
