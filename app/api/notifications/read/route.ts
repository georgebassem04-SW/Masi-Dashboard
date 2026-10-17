/**
 * MARK AS READ — POST /api/notifications/read   Body: { ids: ["order:ORD-1024", …] } or { all: true }
 * Read marks are per staff member (reading yours doesn't change anyone else's).
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { getStaffSession } from "@/lib/auth/session";

const body = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(z.string().max(120)).min(1).max(200) })]);

export async function POST(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  await api.markNotificationsRead(session.staffId, "all" in parsed.data ? "all" : parsed.data.ids, session.token);
  return NextResponse.json({ ok: true });
}
