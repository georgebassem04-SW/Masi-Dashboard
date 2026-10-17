/**
 * FONTS — loaded once here and used everywhere through CSS variables.
 *   --font-body    -> IBM Plex Sans Arabic (Arabic + English text)
 *   --font-display -> El Messiri (headings)
 * To change a font: import another one from "next/font/google" and keep the same `variable` name.
 */
import { El_Messiri, IBM_Plex_Sans_Arabic } from "next/font/google";

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontClassNames = `${body.variable} ${display.variable}`;
