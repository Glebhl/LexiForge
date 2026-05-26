import { LocalStorageStore } from "./local-storage.js";

export { LocalStorageStore };
export {
  DEFAULT_PIPELINE_MODELS,
  PIPELINE_MODEL_STORAGE_KEYS,
  ensurePipelineModels,
  resolvePipelineModel,
} from "./pipeline-models.js";

export const appStorage = new LocalStorageStore();
