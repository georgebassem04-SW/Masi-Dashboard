/**
 * EDIT COUPON — PUT /api/coupons/<code>   Body: the coupon form (the code itself can change)
 * DELETE COUPON — DELETE /api/coupons/<code>  (orders that used it keep the code)
 * Needs permission pricing = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { couponSchema } from "@/lib/validation/pricing";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/coupons/[code]">) {
  const guard = await guardRoute("pricing", "edit");
  if (!guard.ok) return guard.response;
  const parsed = couponSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  const result = await api.updateCoupon(decodeURIComponent((await ctx.params).code), parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  // The website shows offer prices on product cards and pages, so refresh those too
  await revalidateStorefront(["offers", "products", "checkout-options"]);
  return NextResponse.json({ ok: true, code: result.coupon.code });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/coupons/[code]">) {
  const guard = await guardRoute("pricing", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.deleteCoupon(decodeURIComponent((await ctx.params).code), guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  await revalidateStorefront(["offers", "products", "checkout-options"]);
  return NextResponse.json({ ok: true });
}
