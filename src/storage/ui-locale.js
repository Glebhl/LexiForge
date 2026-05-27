import { LocalStorageStore } from "./local-storage.js";

export const UI_LOCALE_STORAGE_KEY = "ui_locale";
export const DEFAULT_UI_LOCALE = "en";
export const SUPPORTED_UI_LOCALES = Object.freeze(["en", "ru"]);

const uiLocaleStorage = new LocalStorageStore();

export function ensureUiLocale() {
  const value = uiLocaleStorage.getItem(UI_LOCALE_STORAGE_KEY, "").trim();
  if (!value) {
    uiLocaleStorage.setItem(
      UI_LOCALE_STORAGE_KEY,
      DEFAULT_UI_LOCALE,
    );
    console.debug(`Saved UI language: ${UI_LOCALE_STORAGE_KEY}`);
    return;
  }
  console.debug(`Loaded UI language: ${value}`);
}

export function normalizeUiLocale(locale) {
  const normalizedLocale = String(locale ?? "")
    .trim()
    .replaceAll("_", "-")
    .toLowerCase();
  const languageCode = normalizedLocale.split("-")[0];

  if (SUPPORTED_UI_LOCALES.includes(normalizedLocale)) {
    return normalizedLocale;
  }

  if (SUPPORTED_UI_LOCALES.includes(languageCode)) {
    return languageCode;
  }

  return DEFAULT_UI_LOCALE;
}

export function getUiLocale() {
  return normalizeUiLocale(
    uiLocaleStorage.getItem(UI_LOCALE_STORAGE_KEY, DEFAULT_UI_LOCALE),
  );
}

export function setUiLocale(locale) {
  const normalizedLocale = normalizeUiLocale(locale);

  uiLocaleStorage.setItem(UI_LOCALE_STORAGE_KEY, normalizedLocale);

  return normalizedLocale;
}
