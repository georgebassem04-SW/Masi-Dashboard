/**
 * SHOW / HIDE ON THE WEBSITE — POST /api/products/<id>/visibility   Body: { visible: boolean }
 * The switch in the products list. Needs permission products = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/products/[id]/visibility">) {
  const guard = await guardRoute("products", "edit");
  if (!guard.ok) return guard.response;
  const parsed = z.object({ visible: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const result = await api.setProductVisibility((await ctx.params).id, parsed.data.visible, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  await revalidateStorefront(["products", `product:${result.product.slug}`]);
  return NextResponse.json({ ok: true });
}
