/**
 * BRANCH ORDER — PUT /api/branches/order   Body: { ids: [...] } (top to bottom)
 * The order used on the website (contact page, store pickup list). Needs permission settings = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { branchOrderSchema } from "@/lib/validation/settings";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("settings", "edit");
  if (!guard.ok) return guard.response;
  const parsed = branchOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  await api.reorderBranches(parsed.data.ids, guard.session.token);
  await revalidateStorefront(["branches"]);
  return NextResponse.json({ ok: true });
}
