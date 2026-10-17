/**
 * NEW SECTION TEMPLATES — what a section contains when it's added with "+ Add section".
 * Texts are placeholders in both languages; the editor replaces them. Change them freely.
 * The order of SECTION_TYPES (pages) and HOME_SECTION_TYPES (homepage) is the order in the "Add section" menu.
 */
import type { CmsSection, HomeBlockType, HomeSectionType, PageSectionType } from "@/types";

export const SECTION_TYPES: PageSectionType[] = ["page_hero", "hero", "banner", "rich_text", "image_text", "stats", "features", "timeline", "faq", "branches", "cta", "contact", "custom_order", "social_feed", "product_spotlight", "locations"];

/** Blocks offered on the homepage: shop blocks first, then the content blocks shared with pages */
export const HOME_SECTION_TYPES: HomeBlockType[] = [
  "hero",
  "gold_prices",
  "categories",
  "featured_products",
  "promotion",
  "banner",
  "brands",
  "video",
  "features",
  "image_text",
  "stats",
  "cta",
  "rich_text",
  "faq",
  "timeline",
  "branches",
  "social_feed",
  "product_spotlight",
  "locations",
];

const L = (ar: string, en: string) => ({ ar, en });
const newId = () => `s_${Math.random().toString(36).slice(2, 10)}`;

export function newSection(type: HomeSectionType, sortOrder: number): CmsSection {
  const base = { id: newId(), isActive: true, sortOrder };
  switch (type) {
    case "page_hero":
      return { ...base, type, data: { title: L("عنوان الصفحة", "Page title"), subtitle: L("", "") } };
    case "rich_text":
      return { ...base, type, data: { title: L("", ""), body: L("<p>اكتب النص هنا.</p>", "<p>Write your text here.</p>"), width: "narrow" } };
    case "image_text":
      return {
        ...base,
        type,
        data: { eyebrow: L("", ""), title: L("عنوان القسم", "Section title"), body: L("<p>اكتب النص هنا.</p>", "<p>Write your text here.</p>"), image: { url: "" }, imagePosition: "end" },
      };
    case "stats":
      return {
        ...base,
        type,
        data: {
          title: L("", ""),
          items: [
            { value: L("+٣٠", "30+"), label: L("عاماً من الخبرة", "years of experience") },
            { value: L("٥", "5"), label: L("فروع", "branches") },
            { value: L("+١٠٠٠", "1,000+"), label: L("تصميم", "designs") },
          ],
        },
      };
    case "features":
      return {
        ...base,
        type,
        data: {
          title: L("لماذا نحن؟", "Why us?"),
          columns: 3,
          items: [
            { icon: "gem", title: L("ذهب أصلي مدموغ", "Genuine hallmarked gold"), text: L("", "") },
            { icon: "scale", title: L("سعر الذهب اليومي", "Daily gold price"), text: L("", "") },
            { icon: "shield", title: L("ضمان وشهادة", "Warranty & certificate"), text: L("", "") },
          ],
        },
      };
    case "timeline":
      return { ...base, type, data: { title: L("قصتنا", "Our story"), items: [{ year: "1995", title: L("البداية", "The beginning"), text: L("", "") }] } };
    case "faq":
      return { ...base, type, data: { title: L("", ""), items: [{ question: L("السؤال؟", "Question?"), answer: L("<p>الإجابة.</p>", "<p>The answer.</p>") }] } };
    case "branches":
      return { ...base, type, data: { title: L("فروعنا", "Our branches"), subtitle: L("", "") } };
    case "cta":
      return {
        ...base,
        type,
        data: { title: L("اكتشف تشكيلتنا", "Discover our collection"), text: L("", ""), primary: { label: L("تسوّق الآن", "Shop now"), href: "/products" }, background: "primary" },
      };
    case "contact":
      return {
        ...base,
        type,
        data: {
          title: L("راسلنا", "Send us a message"),
          subtitle: L("", ""),
          subjects: [{ value: "general", label: L("استفسار عام", "General inquiry") }],
          successMessage: L("وصلتنا رسالتك، سنرد عليك قريباً.", "We got your message and will reply soon."),
          showContactInfo: true,
          showBranchSelect: true,
        },
      };
    case "custom_order":
      return {
        ...base,
        type,
        data: {
          title: L("صمّم قطعتك", "Design your piece"),
          subtitle: L("ارفع صورة القطعة واكتب التفاصيل، وسنرسل لك عرض السعر.", "Upload a photo of the piece, add the details, and we'll send you a quote."),
          steps: [L("ارفع صورة القطعة", "Upload a photo of the piece"), L("اكتب التفاصيل", "Add the details"), L("نتواصل معك بعرض السعر", "We contact you with a quote")],
          successMessage: L("وصلنا طلبك! سنتواصل معك قريباً بعرض السعر.", "We've got your request! We'll contact you soon with a quote."),
          showKarat: true,
          showBudget: true,
        },
      };
    case "social_feed":
      return {
        ...base,
        type,
        data: {
          title: L("تابعونا", "Stay connected"),
          subtitle: L("تابعونا على إنستجرام", "Follow us on Instagram"),
          handle: "",
          profileUrl: "",
          items: [],
          button: { label: L("تابعونا", "Follow us"), href: "" },
        },
      };
    case "product_spotlight":
      return {
        ...base,
        type,
        data: {
          eyebrow: L("", ""),
          title: L("قطع *مميزة*", "Signature *Pieces*"),
          text: L("", ""),
          cta: { label: L("اكتشف الكل", "Discover all"), href: "/products" },
          image: { url: "" },
          imagePosition: "start",
          source: "featured",
          limit: 4,
        },
      };
    case "locations":
      return {
        ...base,
        type,
        data: {
          eyebrow: L("", ""),
          title: L("زورونا *في القاهرة*", "Visit us *in Cairo*"),
          image: { url: "" },
          items: [{ title: L("الفرع", "Our store"), text: L("", ""), link: { label: L("على الخريطة", "View on map"), href: "" } }],
          height: "md",
          overlay: 25,
        },
      };
    /* ----- homepage blocks ----- */
    case "hero":
      return { ...base, type, data: { slides: [{ image: { url: "" }, title: L("عنوان الشريحة", "Slide title"), subtitle: L("", ""), cta: { label: L("تسوّق الآن", "Shop now"), href: "/products" } }] } };
    case "banner":
      return { ...base, type, data: { image: { url: "" }, title: L("", "") } };
    case "featured_products":
      return { ...base, type, data: { title: L("منتجات مميزة", "Featured pieces"), source: "featured", limit: 8 } };
    case "categories":
      return { ...base, type, data: { title: L("تسوق حسب القسم", "Shop by category") } };
    case "brands":
      return { ...base, type, data: { title: L("مجموعاتنا", "Our collections") } };
    case "video":
      return { ...base, type, data: { title: L("", ""), video: { provider: "youtube", url: "" } } };
    case "promotion":
      return { ...base, type, data: { title: L("عرض خاص", "Special offer"), description: L("", ""), cta: { label: L("تسوّق الآن", "Shop now"), href: "/products" } } };
    case "gold_prices":
      return { ...base, type, data: { title: L("أسعار الذهب اليوم", "Today's gold prices"), karats: [24, 21, 18] } };
  }
}
