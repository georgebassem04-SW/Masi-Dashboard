/**
 * PAGE: /settings — opens the first settings tab this person may see
 * (Store details → Staff → My account). The tabs themselves: app/(admin)/settings/layout.tsx.
 */
import { redirect } from "next/navigation";
import { can, requireStaff } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireStaff();
  redirect(can(session, "settings") ? "/settings/store" : can(session, "staff") ? "/settings/staff" : "/settings/account");
}
