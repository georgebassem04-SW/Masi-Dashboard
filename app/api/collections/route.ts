/**
 * ADD COLLECTION — POST /api/collections   Body: the collection form (lib/validation/catalog.ts → brandSchema)
 * Needs permission categories = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { brandSchema } from "@/lib/validation/catalog";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST(request: NextRequest) {
  const guard = await guardRoute("categories", "edit");
  if (!guard.ok) return guard.response;
  const parsed = brandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  const result = await api.createBrand(parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["brands"]);
  return NextResponse.json({ ok: true, id: result.brand.id });
}
