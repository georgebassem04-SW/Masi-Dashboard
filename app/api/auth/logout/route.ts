/**
 * LOG OUT — POST /api/auth/logout  (the "تسجيل الخروج" button in the sidebar)
 * Deletes the staff cookie and goes back to the login page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { destroyStaffSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  await destroyStaffSession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
