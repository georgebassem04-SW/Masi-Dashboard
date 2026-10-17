/**
 * ADD STAFF MEMBER — POST /api/staff
 * Body: { name, email, role, permissions (null = the role's ready-made ones), active, password (temporary) }
 * The new person must change the password at first login. Needs permission staff = edit.
 * Safety rules (lib/staff/rules.ts): only owners add owners; nobody gives more than they have.
 * Answers 422 (fields), 403 { error: "owner_only" | "above_you" }, 409 { error: "email_taken" }.
 */
import { NextResponse, type NextRequest } from "next/server";
import { issues } from "@/lib/validation/issues";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { staffEditProblem } from "@/lib/staff/rules";
import { newStaffSchema } from "@/lib/validation/settings";

export async function POST(request: NextRequest) {
  const guard = await guardRoute("staff", "edit");
  if (!guard.ok) return guard.response;
  const parsed = newStaffSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: issues(parsed.error) }, { status: 422 });
  const { password, ...input } = parsed.data;
  const problem = staffEditProblem(guard.session, null, input);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 403 });
  const result = await api.createStaff(input, password, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true, id: result.staff.id });
}
