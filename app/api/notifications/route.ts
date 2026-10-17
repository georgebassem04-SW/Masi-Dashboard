/**
 * MY NOTIFICATIONS — GET /api/notifications?filter=unread&type=new_order&page=1&pageSize=6
 * Used by the bell (latest few + unread count, every BELL_REFRESH_SECONDS) and the Notifications page.
 * Every logged-in staff member; they only get kinds of sections they may view (config/notifications.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { getStaffSession } from "@/lib/auth/session";
import { NOTIFICATION_KINDS } from "@/config/notifications";
import type { NotificationType } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type");
  const list = await api.listNotifications(
    session.staffId,
    session.permissions,
    {
      filter: sp.get("filter") === "unread" ? "unread" : "all",
      type: NOTIFICATION_KINDS.some((k) => k.type === type) ? (type as NotificationType) : undefined,
      page: Number(sp.get("page")) || 1,
      pageSize: Math.min(Number(sp.get("pageSize")) || 30, 100),
    },
    session.token,
  );
  return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}
