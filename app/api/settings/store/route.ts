/**
 * SAVE STORE DETAILS — PUT /api/settings/store   Body: { contact: { email, phone, whatsapp, address, hours }, social }
 * Shown on the website (footer, contact page, header, order emails), refreshed right away (tag "settings").
 * Needs permission settings = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { storeSettingsSchema } from "@/lib/validation/settings";
import { revalidateStorefront } from "@/lib/storefront-revalidate";
import { issues } from "@/lib/validation/issues";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("settings", "edit");
  if (!guard.ok) return guard.response;
  const parsed = storeSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  await api.saveStoreSettings(parsed.data, guard.session.token);
  await revalidateStorefront(["settings"]);
  return NextResponse.json({ ok: true });
}
