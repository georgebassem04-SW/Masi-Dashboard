/**
 * HOMEPAGE DRAFT — PUT /api/home/draft     Body: { sections }  (auto-save while editing)
 *                  DELETE /api/home/draft  (throw away unpublished changes)
 * Visitors never see drafts. Needs permission content = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { homeContentSchema } from "@/lib/validation/pages";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const parsed = homeContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const result = await api.saveHomeDraft(parsed.data, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true, savedAt: result.home.draftSavedAt });
}

export async function DELETE() {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const result = await api.discardHomeDraft(guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true });
}
