/**
 * 404 — shown for any address that doesn't exist.
 * Text: dictionaries → "notFound"
 */
import { SearchX } from "lucide-react";
import { getLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { NoticePage } from "@/components/common/NoticePage";

export default async function NotFound() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="flex min-h-dvh">
      <NoticePage icon={SearchX} title={dict.notFound.title} backLabel={dict.notFound.back} />
    </div>
  );
}
