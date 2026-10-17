/**
 * NEW TEMPORARY PASSWORD — PUT /api/staff/<id>/password   Body: { password }
 * For someone who forgot theirs: they must choose their own at next login. Needs permission staff = edit.
 * Not for yourself (use My account → Change password) and only owners can do it for an owner.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { staffDeleteProblem } from "@/lib/staff/rules";
import { resetPasswordSchema } from "@/lib/validation/settings";
import { issues } from "@/lib/validation/issues";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/staff/[id]/password">) {
  const guard = await guardRoute("staff", "edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  const target = await api.getStaff(id, guard.session.token);
  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  // Same protection as removing someone: not yourself, owners only by owners, not someone above you
  const problem = staffDeleteProblem(guard.session, target);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  const result = await api.setStaffTempPassword(id, parsed.data.password, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 404 });
  return NextResponse.json({ ok: true });
}
