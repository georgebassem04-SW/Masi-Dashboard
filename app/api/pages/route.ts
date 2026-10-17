/**
 * NEW PAGE — POST /api/pages   Body: { slug, title: { ar, en }, menu: "header" | "footer" | "none" }
 * The page starts as a draft (not on the website). Needs permission content = edit.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { newPageSchema } from "@/lib/validation/pages";
import { RESERVED_SLUGS } from "@/lib/pages/paths";

export async function POST(request: NextRequest) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const parsed = newPageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.message })) }, { status: 422 });
  if (RESERVED_SLUGS.includes(parsed.data.slug)) return NextResponse.json({ ok: false, error: "slug_taken" }, { status: 409 });
  const result = await api.createPage(parsed.data, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  return NextResponse.json({ ok: true, slug: result.page.slug });
}
