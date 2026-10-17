/**
 * CHANGE / REMOVE BRANCH — PUT /api/branches/<id> (same body as adding) · DELETE /api/branches/<id>
 * Needs permission settings = edit. Past orders keep the branch id.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { branchSchema } from "@/lib/validation/settings";
import { revalidateStorefront } from "@/lib/storefront-revalidate";
import { issues } from "@/lib/validation/issues";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/branches/[id]">) {
  const guard = await guardRoute("settings", "edit");
  if (!guard.ok) return guard.response;
  const parsed = branchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  const result = await api.updateBranch((await ctx.params).id, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  await revalidateStorefront(["branches"]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/branches/[id]">) {
  const guard = await guardRoute("settings", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.deleteBranch((await ctx.params).id, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  await revalidateStorefront(["branches"]);
  return NextResponse.json({ ok: true });
}
