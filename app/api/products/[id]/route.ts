/**
 * SAVE PRODUCT — PUT /api/products/<id>   Body: the product form
 * DELETE PRODUCT — DELETE /api/products/<id>  (only products added in the dashboard; ERP products are hidden instead)
 * Needs permission products = edit. The website is told to refresh.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { productSchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const guard = await guardRoute("products", "edit");
  if (!guard.ok) return guard.response;
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });

  const { id } = await ctx.params;
  const before = await api.getProduct(id, guard.session.token);
  const result = await api.updateProduct(id, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  // Old link too, in case the slug changed
  await revalidateStorefront(["products", `product:${result.product.slug}`, ...(before && before.slug !== result.product.slug ? [`product:${before.slug}`] : [])]);
  return NextResponse.json({ ok: true, id: result.product.id });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const guard = await guardRoute("products", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.deleteProduct((await ctx.params).id, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  await revalidateStorefront(["products", `product:${result.product.slug}`]);
  return NextResponse.json({ ok: true });
}
