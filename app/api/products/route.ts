/**
 * ADD PRODUCT — POST /api/products   Body: the product form (lib/validation/catalog.ts → productSchema)
 * Needs permission products = edit. The website is told to refresh its product lists.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { productSchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST(request: NextRequest) {
  const guard = await guardRoute("products", "edit");
  if (!guard.ok) return guard.response;
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });

  const result = await api.createProduct(parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["products", `product:${result.product.slug}`]);
  return NextResponse.json({ ok: true, id: result.product.id });
}
