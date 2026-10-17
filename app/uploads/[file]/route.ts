/**
 * UPLOADED FILES (sample-data mode) — GET /uploads/<file>
 * Serves the files saved in .mock-db/uploads/ so both the dashboard and the storefront can use them.
 * Only names the dashboard itself created are allowed (random hex + a short extension).
 * With the real API, files are served by the API / CDN instead — it must follow the same safety rules:
 *   - pictures, videos, sound and PDF open in the browser
 *   - SVG is shown but locked (no scripts can run)
 *   - EVERYTHING else (web pages, scripts, Office files, zip…) is sent as a download, never opened
 * Videos can be played from any point (Range requests).
 */
import { readFile, stat, open } from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/api/mock-db";
import { KNOWN_TYPES } from "@/lib/media/image-check";

export async function GET(request: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  const match = /^[a-f0-9]{16}\.([a-z0-9]{1,8})$/.exec(file);
  if (!match) return new Response("Not found", { status: 404 });
  const ext = match[1];
  const inline = KNOWN_TYPES[ext];
  const headers: Record<string, string> = {
    "Content-Type": inline ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    // Allow the storefront (another port/domain) to use the file
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Accept-Ranges": "bytes",
  };
  // Not something a browser should open → download it
  if (!inline) headers["Content-Disposition"] = `attachment; filename="${file}"`;
  // An SVG can carry scripts: lock it so it is only ever a picture
  if (ext === "svg") headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";

  const full = path.join(UPLOADS_DIR, file);
  try {
    const { size } = await stat(full);
    // "Range: bytes=start-end" → send only that part (video players ask for this)
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      const handle = await open(full, "r");
      try {
        const chunk = Buffer.alloc(end - start + 1);
        await handle.read(chunk, 0, chunk.length, start);
        return new Response(new Uint8Array(chunk), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(chunk.length) } });
      } finally {
        await handle.close();
      }
    }
    const bytes = await readFile(full);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(size) } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
