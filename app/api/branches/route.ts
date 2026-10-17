/**
 * ADD BRANCH — POST /api/branches   Body: name, city, address, phone, whatsapp?, hours, mapUrl?, image?, isPickupPoint
 * Needs permission settings = edit. The website's branches (contact page, store pickup) refresh right away.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { branchSchema } from "@/lib/validation/settings";
import { revalidateStorefront } from "@/lib/storefront-revalidate";
import { issues } from "@/lib/validation/issues";

export async function POST(request: NextRequest) {
  const guard = await guardRoute("settings", "edit");
  if (!guard.ok) return guard.response;
  const parsed = branchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  const result = await api.createBranch(parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["branches"]);
  return NextResponse.json({ ok: true, id: result.branch.id });
}
