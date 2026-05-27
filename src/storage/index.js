import { LocalStorageStore } from "./local-storage.js";

export { LocalStorageStore };
export {
  DEFAULT_PIPELINE_MODELS,
  PIPELINE_MODEL_STORAGE_KEYS,
  ensurePipelineModels,
  resolvePipelineModel,
} from "./pipeline-models.js";
export {
  DEFAULT_UI_LOCALE,
  SUPPORTED_UI_LOCALES,
  UI_LOCALE_STORAGE_KEY,
  ensureUiLocale,
  getUiLocale,
  normalizeUiLocale,
  setUiLocale,
} from "./ui-locale.js";

export const appStorage = new LocalStorageStore();
