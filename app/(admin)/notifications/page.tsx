/**
 * /notifications — notifications now live in the bell's drop-down list (components/notifications/NotificationBell.tsx)
 * and their settings in Settings → My account. This address is kept so old links still work.
 */
import { redirect } from "next/navigation";

export default function NotificationsPage() {
  redirect("/settings/account#notifications");
}
