/**
 * WHAT TO NOTIFY ME ABOUT — PUT /api/notifications/preferences   Body: { off: ["low_stock", …] }
 * The kinds this staff member doesn't want. Only affects them.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { api } from "@/lib/api";
import { getStaffSession } from "@/lib/auth/session";
import { NOTIFICATION_KINDS } from "@/config/notifications";
import type { NotificationType } from "@/types";

const types = NOTIFICATION_KINDS.map((k) => k.type) as [NotificationType, ...NotificationType[]];
const body = z.object({ off: z.array(z.enum(types)).max(types.length) });

export async function PUT(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  await api.setNotificationsOff(session.staffId, parsed.data.off, session.token);
  return NextResponse.json({ ok: true });
}
