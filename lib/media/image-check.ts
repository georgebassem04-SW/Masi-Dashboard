/**
 * UPLOAD CHECKS — used before any file is saved to the media library.
 * ------------------------------------------------------------------
 * - Any kind of file is accepted (pictures, videos, sound, PDF, Word / Excel, zip…), up to MAX_UPLOAD_MB.
 * - Pictures (PNG, JPEG, WebP, GIF) are recognised from the file's first bytes, NOT from its name, so a renamed
 *   file can't pretend to be a picture. Their width × height are read from the header (shown in the library).
 * - Every other file keeps the extension of its name (cleaned: letters / digits only) and is stored under a random name.
 * - SAFETY: files are never run. Only the kinds in INLINE_TYPES (app/uploads/[file]/route.ts) open in the browser;
 *   everything else — including web pages and scripts — is sent as a download. SVG is shown but locked (no scripts).
 *
 * To change the size limit: MAX_UPLOAD_MB here + `proxyClientMaxBodySize` in next.config.ts (keep it a bit higher).
 */
import type { MediaItem, MediaKind } from "@/types";

export const MAX_UPLOAD_MB = 50;

/** Extension → type, for the files a browser can show or play by itself */
export const KNOWN_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  pdf: "application/pdf",
};

/** "photo.final.JPG" → "jpg" (letters / digits only, at most 8). No usable extension → "bin" */
export function safeExtension(fileName: string): string {
  const ext = /\.([A-Za-z0-9]{1,8})$/.exec(fileName)?.[1]?.toLowerCase();
  return ext ?? "bin";
}

/** Type used for a file that is not one of the recognised pictures: from its extension, else "a file" */
export const typeForExtension = (ext: string): string => KNOWN_TYPES[ext] ?? "application/octet-stream";

/** Rough family of a file, used for its icon and for "pictures only" pickers */
export function kindOf(mimeType: string): MediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  return "other";
}

type Mime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
/** The whole item type is only used for documentation here */
export type { MediaItem };

export function detectImageType(b: Buffer): Mime | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 0, 4) === "GIF8") return "image/gif";
  return null;
}

export const extensionFor: Record<Mime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Reads width × height from the file header. Returns undefined when it can't tell. */
export function imageSize(b: Buffer, type: Mime): { width: number; height: number } | undefined {
  try {
    if (type === "image/png") return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (type === "image/gif") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    if (type === "image/webp") {
      const chunk = b.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = b.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
    if (type === "image/jpeg") {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) return undefined;
        const marker = b[i + 1];
        const len = b.readUInt16BE(i + 2);
        // SOF0..SOF15 (except DHT/JPG/DAC) hold the size
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* unreadable header */
  }
  return undefined;
}
