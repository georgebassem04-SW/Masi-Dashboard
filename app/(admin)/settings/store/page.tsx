/**
 * PAGE: /settings/store — STORE DETAILS (design screen 13)
 * Contact details and social links shown on the website. Form: components/settings/StoreSettingsForm.tsx
 * Store name, logo and colours are in Theme & design. Needs permission "settings" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NoAccess } from "@/components/common/NoticePage";
import { Message } from "@/components/settings/ui";
import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).settings.tabs.store };
}

export default async function StoreSettingsPage() {
  const session = await requireStaff();
  if (!can(session, "settings")) return <NoAccess />;
  const dict = await getDictionary(await getLocale());
  const canEdit = can(session, "settings", "edit");
  return (
    <>
      {!canEdit && <Message tone="info">{dict.settings.common.viewOnly}</Message>}
      <StoreSettingsForm initial={await api.getStoreSettings(session.token)} canEdit={canEdit} labels={dict.settings} />
    </>
  );
}
