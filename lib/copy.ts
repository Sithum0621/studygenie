import english from "./copy-english.json";
import singlish from "./copy-singlish.json";

export type AppLanguage = "singlish" | "english";
export type Copy = typeof singlish;

export const dictionaries = {
  singlish,
  english,
} as const;

export function getCopy(language: AppLanguage): Copy {
  return dictionaries[language];
}
