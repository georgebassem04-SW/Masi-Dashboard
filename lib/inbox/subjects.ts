/**
 * CONTACT SUBJECT NAMES for the inbox.
 * The subjects visitors choose from are edited in Site pages → Contact us → "Contact form" section.
 * This reads them from the live Contact page, and falls back to config/contact-subjects.ts
 * (also used for messages whose subject was removed from the form later).
 */
import "server-only";
import type { LocalizedText } from "@/types";
import { api } from "@/lib/api";
import { CONTACT_SUBJECTS } from "@/config/contact-subjects";

export async function getContactSubjects(token?: string): Promise<{ value: string; label: LocalizedText }[]> {
  const page = await api.getPage("contact", token).catch(() => null);
  const section = page?.published?.sections.find((s) => s.type === "contact");
  const fromPage = section?.type === "contact" ? section.data.subjects : [];
  const seen = new Set(fromPage.map((s) => s.value));
  return [...fromPage, ...CONTACT_SUBJECTS.filter((s) => !seen.has(s.value))];
}

export const labelFor = (subjects: { value: string; label: LocalizedText }[], value: string): LocalizedText =>
  subjects.find((s) => s.value === value)?.label ?? { ar: value, en: value };
