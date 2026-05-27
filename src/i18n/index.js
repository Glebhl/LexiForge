import { DEFAULT_UI_LOCALE, getUiLocale } from "../storage/index.js";
import en from "./locales/en.js";
import ru from "./locales/ru.js";

const TRANSLATIONS = { en, ru };

const pluralRules = new Map();

export function currentLocale() {
  return getUiLocale();
}

export function t(key, params = {}) {
  const template =
    getTranslation(currentLocale(), key) ??
    getTranslation(DEFAULT_UI_LOCALE, key) ??
    key;

  return interpolate(String(template), params);
}

export function tPlural(key, count, params = {}) {
  const locale = currentLocale();
  const pluralCategory = getPluralRules(locale).select(Number(count));
  const pluralKey = hasTranslation(locale, `${key}.${pluralCategory}`)
    ? `${key}.${pluralCategory}`
    : `${key}.other`;

  return t(pluralKey, { count, ...params });
}

export function translateTree(root = document) {
  updateDocumentLocale();
  translateText(root, "data-i18n", (element, value) => {
    element.textContent = value;
  });
  translateText(root, "data-i18n-placeholder", (element, value) => {
    element.setAttribute("placeholder", value);
  });
  translateText(root, "data-i18n-aria-label", (element, value) => {
    element.setAttribute("aria-label", value);
  });
  translateText(root, "data-i18n-title", (element, value) => {
    element.setAttribute("title", value);
  });

  for (const template of findElements(root, "template")) {
    translateTree(template.content);
  }
}

export function updateDocumentLocale() {
  document.documentElement.lang = currentLocale();
}

function getPluralRules(locale) {
  if (!pluralRules.has(locale)) {
    pluralRules.set(locale, new Intl.PluralRules(locale));
  }

  return pluralRules.get(locale);
}

function hasTranslation(locale, key) {
  return getTranslation(locale, key) !== undefined;
}

function getTranslation(locale, key) {
  return key
    .split(".")
    .reduce((value, part) => value?.[part], TRANSLATIONS[locale]);
}

function interpolate(template, params) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return params[key] === undefined ? match : String(params[key]);
  });
}

function translateText(root, attributeName, apply) {
  for (const element of findElements(root, `[${attributeName}]`)) {
    apply(element, t(element.getAttribute(attributeName)));
  }
}

function findElements(root, selector) {
  const elements = [];

  if (root.nodeType === Node.ELEMENT_NODE && root.matches(selector)) {
    elements.push(root);
  }

  if (typeof root.querySelectorAll === "function") {
    elements.push(...root.querySelectorAll(selector));
  }

  return elements;
}
