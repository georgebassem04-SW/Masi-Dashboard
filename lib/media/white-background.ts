/**
 * WHITE BACKGROUND BEHIND SEE-THROUGH PICTURES
 * ------------------------------------------------------------------
 * A picture uploaded with no background (a PNG / WebP with see-through parts, e.g. a ring cut out of its photo)
 * gets a plain WHITE background before it is saved — so product photos look clean on the website.
 *
 *   - Switched on for every upload by default (WHITE_BACKGROUND_DEFAULT below).
 *   - Kept see-through when the upload asks for it (form field "keepTransparent" = "1"): the logos, the tab icon,
 *     the footer divider, a cropped picture saved with "See-through", or the switch in the Media library.
 *   - Uses "sharp" (installed with Next.js). If it is missing, the picture is saved as it was.
 */
import "server-only";

/** Change to false to keep see-through pictures as they are unless the editor asks for white */
export const WHITE_BACKGROUND_DEFAULT = true;

type Mime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** Returns the picture with white behind its see-through parts, or null when nothing had to change */
export async function whiteBehindTransparent(bytes: Buffer, mime: Mime): Promise<Buffer | null> {
  // JPEG has no see-through parts; GIF may be animated (left as it is)
  if (mime !== "image/png" && mime !== "image/webp") return null;
  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(bytes, { failOn: "none" });
    const meta = await image.metadata();
    if (!meta.hasAlpha) return null;
    // Only when some pixels are really see-through (many PNGs carry an alpha channel that is fully solid)
    const { channels } = await image.stats();
    const alpha = channels[channels.length - 1];
    if (alpha && alpha.min === 255) return null;
    const flat = sharp(bytes, { failOn: "none" }).flatten({ background: "#ffffff" });
    return mime === "image/png" ? await flat.png({ compressionLevel: 9 }).toBuffer() : await flat.webp({ quality: 92 }).toBuffer();
  } catch (error) {
    console.warn("[media] white background skipped:", error instanceof Error ? error.message : error);
    return null;
  }
}
