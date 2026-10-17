/**
 * PUBLISH — POST /api/pages/<slug>/publish
 * Checks that every required text is filled in BOTH languages (lib/pages/content.ts), then makes the draft live
 * and tells the website to refresh the page and the menus. Needs permission content = edit.
 * Answers 422 { error: "incomplete", problems: [{ section, field }] } when something is missing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { publishProblems } from "@/lib/pages/content";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/pages/[slug]/publish">) {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const { slug } = await ctx.params;
  const page = await api.getPage(slug, guard.session.token);
  if (!page) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const content = page.draft ?? page.published;
  const problems = content ? publishProblems(content) : [];
  if (problems.length) return NextResponse.json({ ok: false, error: "incomplete", problems }, { status: 422 });

  const result = await api.publishPage(slug, guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["pages", `page:${slug}`]);
  return NextResponse.json({ ok: true });
}
