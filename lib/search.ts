/**
 * SEARCH TEXT CLEANER — used by the orders and customers search (sample mode).
 * Makes these match each other, so staff find what they typed however it was written:
 *   أ إ آ ا → ا     ة → ه     ى → ي     ؤ → و     ئ → ي
 *   Arabic digits ٠١٢… → 0 1 2 …     tashkeel and ـ removed     lower case
 * (The real API should do the same on its side.)
 */
export function normalizeSearch(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** true when `text` is found in any of the fields. Phone numbers also match without spaces, + or leading zeros. */
export function matchesSearch(text: string, fields: (string | undefined)[]): boolean {
  const q = normalizeSearch(text);
  if (!q) return true;
  const hay = normalizeSearch(fields.filter(Boolean).join(" "));
  if (hay.includes(q)) return true;
  const digits = q.replace(/\D/g, "").replace(/^0+/, "");
  return digits.length >= 4 && hay.replace(/\D/g, "").includes(digits);
}
