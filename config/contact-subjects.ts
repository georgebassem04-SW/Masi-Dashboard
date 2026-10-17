/**
 * CONTACT FORM SUBJECTS — FALLBACK names for the inbox.
 * The real list is edited in Site pages → Contact us → "Contact form" section and read from there
 * (lib/inbox/subjects.ts). This list is used when the Contact page can't be read, and for messages whose
 * subject was later removed from the form. A subject id found nowhere is shown as-is.
 */
import type { LocalizedText } from "@/types";

export const CONTACT_SUBJECTS: { value: string; label: LocalizedText }[] = [
  { value: "general", label: { ar: "استفسار عام", en: "General inquiry" } },
  { value: "order", label: { ar: "متابعة طلب", en: "Order follow-up" } },
  { value: "custom_design", label: { ar: "تصميم خاص", en: "Custom design" } },
  { value: "repair", label: { ar: "صيانة وتلميع", en: "Repair & polishing" } },
  { value: "gold_price", label: { ar: "أسعار الذهب والسبائك", en: "Gold prices & bars" } },
  { value: "complaint", label: { ar: "شكوى أو اقتراح", en: "Complaint or suggestion" } },
  // Sent from the B2B page form (hidden for MASI)
  { value: "wholesale", label: { ar: "طلب تسجيل جملة", en: "Wholesale registration" } },
];

export const subjectLabel = (value: string): LocalizedText => CONTACT_SUBJECTS.find((s) => s.value === value)?.label ?? { ar: value, en: value };
