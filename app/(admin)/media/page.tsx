/**
 * PAGE: /media — MEDIA LIBRARY (مكتبة الوسائط)
 * All images available for the website: upload, describe, copy link, delete.
 * The same library opens inside the theme editor to pick a logo, icon, share image…
 *   - Who can open it: permission "content" or "theme" (edit = upload/delete, view = look only)
 *   - The library itself: components/media/MediaBrowser.tsx
 *   - Upload rules: lib/media/image-check.ts
 */
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NoAccess } from "@/components/common/NoticePage";
import { MediaBrowser } from "@/components/media/MediaBrowser";

export default async function MediaPage() {
  const session = await requireStaff();
  if (!can(session, "content") && !can(session, "theme")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-7">
      <p className="text-sm text-muted-foreground">{dict.media.subtitle}</p>
      <MediaBrowser locale={locale} labels={dict.media} canEdit={can(session, "content", "edit") || can(session, "theme", "edit")} />
    </div>
  );
}
