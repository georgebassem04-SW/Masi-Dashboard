/**
 * READY REPLIES for contact messages (the "ردود جاهزة" buttons above the reply box).
 * Each one has an Arabic and an English version — the one matching the visitor's language is used.
 * {name} = the visitor's first name, {store} = the store name. Add, remove or edit freely.
 */
import type { LocalizedText } from "@/types";

export const REPLY_TEMPLATES: { key: string; title: LocalizedText; text: LocalizedText }[] = [
  {
    key: "thanks",
    title: { ar: "شكر وتأكيد", en: "Thanks" },
    text: {
      ar: "أهلاً {name}، شكراً لتواصلك مع {store}. استلمنا رسالتك وسنعود إليك بالتفاصيل قريباً.",
      en: "Hi {name}, thank you for contacting {store}. We received your message and will get back to you with the details shortly.",
    },
  },
  {
    key: "visit",
    title: { ar: "دعوة لزيارة الفرع", en: "Visit the branch" },
    text: {
      ar: "أهلاً {name}، يسعدنا استقبالك في الفرع لمشاهدة القطع ومساعدتك في الاختيار. مواعيد العمل من السبت إلى الخميس، ١١ صباحاً حتى ١٠ مساءً.",
      en: "Hi {name}, we'd be happy to welcome you at our branch to see the pieces and help you choose. We're open Saturday to Thursday, 11 am to 10 pm.",
    },
  },
  {
    key: "custom",
    title: { ar: "تصميم خاص", en: "Custom design" },
    text: {
      ar: "أهلاً {name}، التصميم الخاص متاح. أرسل لنا صورة أو فكرة للتصميم، والعيار والمقاس المطلوب، وسنرسل لك السعر التقريبي ومدة التنفيذ.",
      en: "Hi {name}, custom designs are available. Send us a picture or idea of the design, with the karat and size you want, and we'll send an estimated price and delivery time.",
    },
  },
];
