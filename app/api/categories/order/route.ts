/**
 * CATEGORY ORDER — PUT /api/categories/order   Body: { ids: [first, second, …] }
 * Saved after dragging (or the up / down buttons). Needs permission categories = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { reorderSchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  await api.reorderCategories(parsed.data.ids, guard.session.token);
  await revalidateStorefront(["categories"]);
  return NextResponse.json({ ok: true });
}
