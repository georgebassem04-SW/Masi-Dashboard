/**
 * PUBLISH THEME — POST /api/theme/publish
 * Makes the saved draft live on the website, then asks the storefront to refresh (tag "theme").
 * Needs permission theme = edit.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST() {
  const guard = await guardRoute("theme", "edit");
  if (!guard.ok) return guard.response;
  const state = await api.publishTheme(guard.session.name, guard.session.token);
  await revalidateStorefront(["theme"]);
  return NextResponse.json({ ok: true, state });
}
