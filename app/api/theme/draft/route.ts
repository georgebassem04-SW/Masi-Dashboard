/**
 * THEME DRAFT
 *   PUT    /api/theme/draft   Body: the whole SiteTheme → saves it as a draft (not live yet)
 *   DELETE /api/theme/draft   → throws the draft away
 * Needs permission theme = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { siteThemeSchema } from "@/lib/validation/theme";

export async function PUT(request: NextRequest) {
  const guard = await guardRoute("theme", "edit");
  if (!guard.ok) return guard.response;

  const parsed = siteThemeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message }));
    return NextResponse.json({ ok: false, error: "validation", issues }, { status: 422 });
  }
  const state = await api.saveThemeDraft(parsed.data, guard.session.name, guard.session.token);
  return NextResponse.json({ ok: true, state });
}

export async function DELETE() {
  const guard = await guardRoute("theme", "edit");
  if (!guard.ok) return guard.response;
  const state = await api.discardThemeDraft(guard.session.token);
  return NextResponse.json({ ok: true, state });
}
