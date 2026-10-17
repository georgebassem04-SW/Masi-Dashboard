/**
 * Loads the fixed dashboard texts (menu, buttons, titles) from lib/i18n/dictionaries/<lang>.json.
 * To change a text: edit ar.json AND en.json (every key must exist in both).
 */
import "server-only";
import type { Locale } from "@/types";

const dictionaries = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["ar"]>>;

export const getDictionary = (locale: Locale): Promise<Dictionary> => dictionaries[locale]();
