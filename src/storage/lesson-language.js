import { LocalStorageStore } from "./local-storage.js";

export const LESSON_LANGUAGE_STORAGE_KEY = "lesson_language";
export const DEFAULT_LESSON_LANGUAGE = "en_US";
export const SUPPORTED_LESSON_LANGUAGES = Object.freeze(["en_US", "de_DE"]);

const lessonLanguageStorage = new LocalStorageStore();

export function ensureLessonLanguage() {
  const value = lessonLanguageStorage
    .getItem(LESSON_LANGUAGE_STORAGE_KEY, "")
    .trim();

  if (!value) {
    lessonLanguageStorage.setItem(
      LESSON_LANGUAGE_STORAGE_KEY,
      DEFAULT_LESSON_LANGUAGE,
    );
    console.debug(`Saved lesson language: ${LESSON_LANGUAGE_STORAGE_KEY}`);
    return;
  }

  console.debug(`Loaded lesson language: ${value}`);
}

export function normalizeLessonLanguage(language) {
  const [languageCode, regionCode] = String(language ?? "")
    .trim()
    .replaceAll("-", "_")
    .split("_");
  const normalizedLanguage = [
    languageCode?.toLowerCase(),
    regionCode?.toUpperCase(),
  ]
    .filter(Boolean)
    .join("_");

  if (SUPPORTED_LESSON_LANGUAGES.includes(normalizedLanguage)) {
    return normalizedLanguage;
  }

  return DEFAULT_LESSON_LANGUAGE;
}

export function getLessonLanguage() {
  return normalizeLessonLanguage(
    lessonLanguageStorage.getItem(
      LESSON_LANGUAGE_STORAGE_KEY,
      DEFAULT_LESSON_LANGUAGE,
    ),
  );
}

export function setLessonLanguage(language) {
  const normalizedLanguage = normalizeLessonLanguage(language);

  lessonLanguageStorage.setItem(
    LESSON_LANGUAGE_STORAGE_KEY,
    normalizedLanguage,
  );

  return normalizedLanguage;
}
