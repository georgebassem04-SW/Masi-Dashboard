/**
 * PUBLISH HOMEPAGE — POST /api/home/publish
 * Checks that every required text / picture is filled in BOTH languages (lib/pages/content.ts), then makes the
 * draft live and tells the website to refresh the homepage. Needs permission content = edit.
 * Answers 422 { error: "incomplete", problems: [{ section, field }] } when something is missing.
 */
import { NextResponse } from "next/server";
import { api } from "@/lib/api";
import { guardRoute } from "@/lib/auth/route-guard";
import { publishProblems } from "@/lib/pages/content";
import { revalidateStorefront } from "@/lib/storefront-revalidate";

export async function POST() {
  const guard = await guardRoute("content", "edit");
  if (!guard.ok) return guard.response;
  const home = await api.getHome(guard.session.token);
  const problems = publishProblems(home.draft ?? home.published);
  if (problems.length) return NextResponse.json({ ok: false, error: "incomplete", problems }, { status: 422 });

  const result = await api.publishHome(guard.session.name, guard.session.token);
  if (!result.ok) return NextResponse.json(result, { status: 409 });
  await revalidateStorefront(["home"]);
  return NextResponse.json({ ok: true });
}
