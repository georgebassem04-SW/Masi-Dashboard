/**
 * MEDIA LIBRARY
 *   GET    /api/media                       → list of files           (needs content, theme, products OR categories: view)
 *   POST   /api/media  (form, field "file") → upload one file         (… edit)
 *   DELETE /api/media  Body: { ids: [...] } → delete several at once  (… edit) — "Select" in the library
 * Upload rules (lib/media/image-check.ts): any file type, max 50 MB. Pictures are recognised by their content.
 * See-through pictures get a WHITE background (lib/media/white-background.ts) unless the form sends keepTransparent = "1".
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { can, getStaffSession } from "@/lib/auth/session";
import { detectImageType, extensionFor, imageSize, MAX_UPLOAD_MB, safeExtension, typeForExtension } from "@/lib/media/image-check";
import type { AccessLevel } from "@/lib/auth/permissions";
import { WHITE_BACKGROUND_DEFAULT, whiteBehindTransparent } from "@/lib/media/white-background";

/** Designers (theme), content editors (content) and product / category editors (their photos) all use the library */
const MEDIA_USERS = ["content", "theme", "products", "categories"] as const;

async function mediaSession(level: AccessLevel) {
  const session = await getStaffSession();
  if (!session) return { error: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }) };
  if (!MEDIA_USERS.some((key) => can(session, key, level))) {
    return { error: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const { session, error } = await mediaSession("view");
  if (error) return error;
  return NextResponse.json({ ok: true, items: await api.listMedia(session.token) });
}

export async function POST(request: NextRequest) {
  const { session, error } = await mediaSession("edit");
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  // A real picture is recognised by its content (and stored with the matching extension, whatever its name says);
  // any other file keeps the cleaned extension of its name
  const image = detectImageType(bytes);
  const extension = image ? extensionFor[image] : safeExtension(file.name);
  const mimeType = image ?? typeForExtension(extension);
  // No background → white background (logos, the tab icon… send keepTransparent = "1" to stay see-through)
  const keepTransparent = form?.get("keepTransparent") === "1" || !WHITE_BACKGROUND_DEFAULT;
  if (image && !keepTransparent) {
    const white = await whiteBehindTransparent(bytes, image);
    if (white) bytes = white;
  }

  const item = await api.uploadMedia(
    { fileName: file.name || "file", extension, mimeType, bytes, ...(image ? imageSize(bytes, image) : {}) },
    session.name,
    session.token,
  );
  return NextResponse.json({ ok: true, item });
}

const idsSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(500) });

export async function DELETE(request: NextRequest) {
  const { session, error } = await mediaSession("edit");
  if (error) return error;
  const parsed = idsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  let deleted = 0;
  for (const id of parsed.data.ids) if (await api.deleteMedia(id, session.token)) deleted += 1;
  return NextResponse.json({ ok: true, deleted });
}
