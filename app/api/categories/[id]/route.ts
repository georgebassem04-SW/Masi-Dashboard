/**
 * SAVE CATEGORY — PUT /api/categories/<id>   Body: the category form
 * DELETE CATEGORY — DELETE /api/categories/<id>  (only when it has no products and no sub-categories)
 * Needs permission categories = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { categorySchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  const result = await api.updateCategory((await ctx.params).id, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  // Hiding a category hides its products too, so product lists refresh as well
  await revalidateStorefront(["categories", "products"]);
  return NextResponse.json({ ok: true, id: result.category.id });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.deleteCategory((await ctx.params).id, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  await revalidateStorefront(["categories"]);
  return NextResponse.json({ ok: true });
}
