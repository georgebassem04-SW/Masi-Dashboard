/**
 * CHANGE / REMOVE A STAFF MEMBER — PUT /api/staff/<id>   Body: { name, email, role, permissions, active }
 *                                  DELETE /api/staff/<id>
 * Needs permission staff = edit. Safety rules (lib/staff/rules.ts):
 *   403 "self" (your own role / permissions / on-off, or deleting yourself) · "owner_only" · "above_you"
 *   409 "last_owner" (at least one active owner must remain) · "email_taken"
 * Changes work at once: the person's next click already uses the new permissions (lib/auth/session.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { staffDeleteProblem, staffEditProblem } from "@/lib/staff/rules";
import { staffInputSchema } from "@/lib/validation/settings";
import { issues } from "@/lib/validation/issues";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/staff/[id]">) {
  const guard = await guardRoute("staff", "edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const parsed = staffInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  const target = await api.getStaff(id, guard.session.token);
  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const problem = staffEditProblem(guard.session, target, parsed.data);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  const result = await api.updateStaff(id, parsed.data, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "not_found" ? 404 : 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/staff/[id]">) {
  const guard = await guardRoute("staff", "edit");
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const target = await api.getStaff(id, guard.session.token);
  if (!target) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const problem = staffDeleteProblem(guard.session, target);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  const result = await api.deleteStaff(id, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true });
}
