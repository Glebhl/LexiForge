import { LocalStorageStore } from "./local-storage.js";

const pipelineModelStorage = new LocalStorageStore();

export const DEFAULT_PIPELINE_MODELS = Object.freeze({
  answerChecking: "google/gemini-3.1-flash-lite",
  cards: "google/gemini-3.1-flash-lite",
  content: "google/gemini-3-flash-preview",
  goals: "google/gemini-3.5-flash",
  plan: "google/gemini-3.5-flash",
});

export const PIPELINE_MODEL_STORAGE_KEYS = Object.freeze({
  answerChecking: "pipeline_answer_checking_model",
  cards: "pipeline_cards_model",
  content: "pipeline_content_model",
  goals: "pipeline_goals_model",
  plan: "pipeline_plan_model",
});

export function ensurePipelineModels() {
  for (const [pipelineKey, storageKey] of Object.entries(
    PIPELINE_MODEL_STORAGE_KEYS,
  )) {
    const value = pipelineModelStorage.getItem(storageKey, "").trim();
    if (!value) {
      pipelineModelStorage.setItem(
        storageKey,
        DEFAULT_PIPELINE_MODELS[pipelineKey],
      );
      console.debug(`Saved model ${DEFAULT_PIPELINE_MODELS[pipelineKey]} for key ${storageKey}`);
      continue;
    }
    console.debug(`Loaded model ${value} for key ${storageKey}`);
  }
}

export function resolvePipelineModel(pipelineKey, explicitModel) {
  if (explicitModel) {
    return explicitModel;
  }

  const storageKey = PIPELINE_MODEL_STORAGE_KEYS[pipelineKey];

  if (!storageKey) {
    throw new Error(`Unknown pipeline model key: ${pipelineKey}`);
  }

  const storedModel = pipelineModelStorage.getItem(storageKey, "").trim();

  if (storedModel) {
    return storedModel;
  }

  throw new Error(
    `Pipeline model is missing. Add ${storageKey} in storage.html.`,
  );
}
