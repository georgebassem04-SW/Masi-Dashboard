/**
 * CUSTOMER PHOTO — GET /api/custom-requests/photo/<file>   (test mode only)
 * Shows a photo a customer sent with a "Design your piece" request. Staff only (permission custom = view):
 * customers' photos are private, so they are never put in the public media library.
 * The file is read from the storefront's .mock-db/custom-photos/ (STOREFRONT_MOCK_DB in .env.local).
 * With the real API the photo addresses come from the API, and this route isn't used.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { guardRoute } from "@/lib/auth/route-guard";
import { customPhotosDir } from "@/lib/api/mock-custom";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, ctx: RouteContext<"/api/custom-requests/photo/[file]">) {
  const guard = await guardRoute("custom", "view");
  if (!guard.ok) return guard.response;

  const file = (await ctx.params).file;
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const dir = customPhotosDir();
  // Only plain names like "cus_1a2b3c4d-1.jpg" — never a path
  if (!dir || !/^[a-z0-9_-]{1,80}\.(jpg|png|webp)$/i.test(file) || !TYPES[ext]) return new NextResponse(null, { status: 404 });

  try {
    const data = await readFile(path.join(dir, file));
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": TYPES[ext], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
