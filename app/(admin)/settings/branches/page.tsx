/**
 * PAGE: /settings/branches — BRANCHES
 * Name, city, address, phone, WhatsApp, hours, map, picture, pickup point, order.
 * Manager: components/settings/BranchesManager.tsx. Needs permission "settings" (view to see, edit to change).
 */
import type { Metadata } from "next";
import { api } from "@/lib/api";
import { can, requireStaff } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeConfig } from "@/config/store";
import { NoAccess } from "@/components/common/NoticePage";
import { Message } from "@/components/settings/ui";
import { BranchesManager } from "@/components/settings/BranchesManager";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary(await getLocale())).settings.tabs.branches };
}

export default async function BranchesPage() {
  const session = await requireStaff();
  if (!can(session, "settings")) return <NoAccess />;
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const canEdit = can(session, "settings", "edit");
  return (
    <>
      {!canEdit && <Message tone="info">{dict.settings.common.viewOnly}</Message>}
      <BranchesManager
        branches={await api.getBranches(session.token)}
        canEdit={canEdit}
        locale={locale}
        storefrontUrl={storeConfig.storefrontUrl.replace(/\/$/, "")}
        labels={dict.settings}
        imageLabels={dict.theme.media}
        mediaLabels={dict.media}
      />
    </>
  );
}
