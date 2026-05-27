import { showLoadingScreen } from "./loading-screen.js";
import { t } from "../../../i18n/index.js";
import * as questionTask from "./tasks/question-task.js";
import * as explanationTask from "./tasks/explanation-task.js";
import * as fillingTask from "./tasks/filling-task.js";
import * as translationTask from "./tasks/translation-task.js";
import * as matchingTask from "./tasks/matching-task.js";

const TRANSITION_FALLBACK_MS = 450;

const taskControllers = {
  question: questionTask,
  explanation: explanationTask,
  filling: fillingTask,
  translation: translationTask,
  matching: matchingTask,
};

let elements = {};

const queue = [];
const progress = {
  enabled: true,
  stagesAmount: 0,
  generatedByStage: [],
  shownByStage: [],
  generatedTotal: 0,
  shownTotal: 0,
};
let stagesRemaining = 0;
let stageFinished = false;
let pendingResolve = null;
let transitionToken = 0;

export function bindExerciseLoader(nextElements) {
  elements = nextElements;
  queue.length = 0;
  stagesRemaining = 0;
  stageFinished = false;
  pendingResolve = null;
  transitionToken = 0;
  resetProgressState();
}

export function unbindExerciseLoader() {
  notify();
  elements = {};
  queue.length = 0;
}

function ensureExerciseLoaderBound() {
  if (!elements.container || !elements.continueBtn || !elements.skipBtn) {
    throw new Error("Lesson flow view is not mounted");
  }
}

function resetProgressState() {
  progress.enabled = true;
  progress.stagesAmount = 0;
  progress.generatedByStage = [];
  progress.shownByStage = [];
  progress.generatedTotal = 0;
  progress.shownTotal = 0;
  renderProgressBars();
  updateProgressView();
}

function normalizeStagesAmount(amount) {
  const normalizedAmount = Number(amount);

  if (normalizedAmount === Infinity) {
    return Infinity;
  }

  if (!Number.isFinite(normalizedAmount)) {
    return 0;
  }

  return Math.max(0, Math.floor(normalizedAmount));
}

function progressBarCount() {
  return Number.isFinite(progress.stagesAmount) ? progress.stagesAmount : 0;
}

function normalizeStageIdx(stageIdx) {
  const normalizedIdx = Number(stageIdx);
  const barCount = progressBarCount();
  const fallbackIdx = 0;

  if (!Number.isFinite(normalizedIdx)) {
    return fallbackIdx;
  }

  const nextIdx = Math.max(0, Math.floor(normalizedIdx));
  return barCount > 0 ? Math.min(nextIdx, barCount - 1) : nextIdx;
}

function renderProgressBars() {
  if (!elements.progressBars) {
    return;
  }

  elements.progressBars.replaceChildren();

  if (!progress.enabled) {
    return;
  }

  for (let index = 0; index < progressBarCount(); index += 1) {
    const barElement = document.createElement("div");
    const fillElement = document.createElement("div");

    barElement.className = "lesson-progress-bar";
    fillElement.className = "lesson-progress__fill";
    barElement.append(fillElement);
    elements.progressBars.append(barElement);
  }
}

function updateProgressView() {
  elements.progressRoot?.classList.toggle(
    "lesson-progress--bars-hidden",
    !progress.enabled,
  );

  if (elements.progressText) {
    if (progress.generatedTotal === 0) {
      elements.progressText.textContent = "";
    } else if (progress.enabled) {
      elements.progressText.textContent = `${progress.shownTotal} / ${progress.generatedTotal}`;
    } else {
      elements.progressText.textContent = t("lesson.progress.task", {
        count: progress.shownTotal,
      });
    }
  }

  if (!progress.enabled || !elements.progressBars) {
    return;
  }

  Array.from(elements.progressBars.children).forEach((barElement, index) => {
    const total = progress.generatedByStage[index] || 0;
    const shown = Math.min(progress.shownByStage[index] || 0, total);
    const progressPercent = total === 0 ? 0 : (shown / total) * 100;
    const fillElement = barElement.querySelector(".lesson-progress__fill");

    if (fillElement) {
      fillElement.style.width = `${progressPercent}%`;
    }
  });
}

function recordGeneratedExercise(meta) {
  const stageIdx = normalizeStageIdx(meta?.stageIdx);

  progress.generatedByStage[stageIdx] =
    (progress.generatedByStage[stageIdx] || 0) + 1;
  progress.generatedTotal += 1;
  updateProgressView();

  return stageIdx;
}

function recordShownExercise(stageIdx) {
  const normalizedStageIdx = normalizeStageIdx(stageIdx);

  progress.shownByStage[normalizedStageIdx] =
    (progress.shownByStage[normalizedStageIdx] || 0) + 1;
  progress.shownTotal += 1;
  updateProgressView();
}

function getTransitionClasses(direction = "next") {
  if (direction === "prev") {
    return {
      incoming: "is-enter-from-left",
      outgoing: "is-enter-from-right",
    };
  }

  return {
    incoming: "is-enter-from-right",
    outgoing: "is-enter-from-left",
  };
}

function waitForTransition(element) {
  return new Promise((resolve) => {
    let done = false;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      element.removeEventListener("transitionend", onTransitionEnd);
      resolve();
    }

    function onTransitionEnd(event) {
      if (event.target === element && event.propertyName === "transform") {
        finish();
      }
    }

    const timeoutId = setTimeout(finish, TRANSITION_FALLBACK_MS);
    element.addEventListener("transitionend", onTransitionEnd);
  });
}

function cleanupStage(visibleTask) {
  for (const taskElement of elements.container.querySelectorAll(
    ".lesson-task",
  )) {
    if (taskElement !== visibleTask) {
      taskElement.remove();
    }
  }
}

function getTaskElement(templateId) {
  const template = document.getElementById(templateId);

  if (!template) {
    throw new Error(`Task template was not found: ${templateId}`);
  }

  const fragment = template.content.cloneNode(true);
  const taskElement = fragment.querySelector(".lesson-task");

  if (!taskElement) {
    throw new Error(`Task template has no .lesson-task: ${templateId}`);
  }

  return taskElement;
}

function mountTask(templateId, setupTask, direction = "next") {
  const nextTask = getTaskElement(templateId);
  const previousTask =
    elements.container.querySelector(".lesson-task.is-active") ||
    elements.container.querySelector(".lesson-task");
  const token = transitionToken + 1;
  const classes = getTransitionClasses(direction);

  transitionToken = token;

  if (typeof setupTask === "function") {
    setupTask(nextTask);
  }

  nextTask.classList.add(classes.incoming);
  elements.container.append(nextTask);

  requestAnimationFrame(() => {
    nextTask.classList.remove("is-enter-from-left", "is-enter-from-right");
    nextTask.classList.add("is-active");

    if (previousTask) {
      previousTask.classList.remove("is-active");
      previousTask.classList.add(classes.outgoing);
    }
  });

  waitForTransition(nextTask).then(() => {
    if (transitionToken === token) {
      cleanupStage(nextTask);
    }
  });

  return nextTask;
}

function notify() {
  if (!pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve();
}

function lessonComplete() {
  return (
    Number.isFinite(stagesRemaining) &&
    stagesRemaining === 0 &&
    queue.length === 0
  );
}

export function setProgressEnabled(enabled) {
  ensureExerciseLoaderBound();
  progress.enabled = Boolean(enabled);
  renderProgressBars();
  updateProgressView();
}

export function setStagesAmount(amount) {
  ensureExerciseLoaderBound();
  const normalizedAmount = normalizeStagesAmount(amount);

  stagesRemaining = normalizedAmount;
  progress.stagesAmount = normalizedAmount;
  progress.generatedByStage = Array.from(
    { length: progressBarCount() },
    (_, index) => progress.generatedByStage[index] || 0,
  );
  progress.shownByStage = Array.from(
    { length: progressBarCount() },
    (_, index) => progress.shownByStage[index] || 0,
  );
  renderProgressBars();
  updateProgressView();
}

export function appendExercise(exercise_id, content, meta) {
  ensureExerciseLoaderBound();
  elements.skipBtn.disabled = false;
  queue.push({
    exercise_id,
    content,
    meta: { ...meta, stageIdx: recordGeneratedExercise(meta) },
  });
  notify();
}

export function finishStage() {
  ensureExerciseLoaderBound();
  stageFinished = true;
  if (Number.isFinite(stagesRemaining)) {
    stagesRemaining = Math.max(0, stagesRemaining - 1);
  }
  notify();
}

export async function showNextExercise() {
  ensureExerciseLoaderBound();
  elements.continueBtn.disabled = true;

  if (queue.length === 0) {
    if (lessonComplete()) return [true, () => true];
    elements.skipBtn.disabled = true;
    showLoadingScreen(elements, mountTask);
    await new Promise((resolve) => {
      pendingResolve = resolve;
    });
  }

  const { exercise_id, content, meta } = queue.shift();
  recordShownExercise(meta.stageIdx);
  const verifier = taskControllers[exercise_id].loadTask(
    elements,
    mountTask,
    content,
    meta,
  );

  const isFinalInStage = stageFinished && queue.length === 0;
  if (isFinalInStage) stageFinished = false;
  return [isFinalInStage, verifier];
}
