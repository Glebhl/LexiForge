import { showLoadingScreen } from "./loading-screen.js";
import * as questionTask from "./tasks/question-task.js";
import * as explanationTask from "./tasks/explanation-task.js";
import * as fillingTask from "./tasks/filling-task.js";
import * as translationTask from "./tasks/translation-task.js";
import * as matchingTask from "./tasks/matching-task.js";

const taskControllers = {
  question: questionTask,
  explanation: explanationTask,
  filling: fillingTask,
  translation: translationTask,
  matching: matchingTask,
};

const elements = {
  container: document.getElementById("taskStage"),
  continueBtn: document.getElementById("continue"),
  skipBtn: document.getElementById("skip"),
};

const queue = [];
let stagesRemaining = 0;
let stageFinished = false;
let pendingResolve = null;

function notify() {
  if (!pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve();
}

function lessonComplete() {
  return stagesRemaining === 0 && queue.length === 0;
}

export function setStagesAmount(amount) {
  stagesRemaining = amount;
}

export function appendExercise(exercise_id, content) {
  queue.push({ exercise_id, content });
  notify();
}

export function finishStage() {
  stageFinished = true;
  stagesRemaining = Math.max(0, stagesRemaining - 1);
  notify();
}

export async function showNextExercise() {
  if (queue.length === 0) {
    if (lessonComplete()) return [true, () => true];
    elements.continueBtn.disabled = true;
    elements.skipBtn.disabled = true;
    showLoadingScreen(elements.container);
    await new Promise((resolve) => { pendingResolve = resolve; });
  }

  const { exercise_id, content } = queue.shift();
  const verifier = taskControllers[exercise_id].loadTask(elements, content);

  const isFinalInStage = stageFinished && queue.length === 0;
  if (isFinalInStage) stageFinished = false;
  return [isFinalInStage, verifier];
}
