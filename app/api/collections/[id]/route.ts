/**
 * SAVE COLLECTION — PUT /api/collections/<id>   Body: the collection form
 * DELETE COLLECTION — DELETE /api/collections/<id>  (its products stay, without a collection)
 * Needs permission categories = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { brandSchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/collections/[id]">) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const parsed = brandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  const result = await api.updateBrand((await ctx.params).id, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  // The product filter lists the collections too
  await revalidateStorefront(["brands", "products"]);
  return NextResponse.json({ ok: true, id: result.brand.id });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/collections/[id]">) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.deleteBrand((await ctx.params).id, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  await revalidateStorefront(["brands", "products"]);
  return NextResponse.json({ ok: true });
}
