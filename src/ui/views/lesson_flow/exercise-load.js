import { showLoadingScreen } from "./loading-screen.js";
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

const elements = {
  container: document.getElementById("taskStage"),
  continueBtn: document.getElementById("continue"),
  skipBtn: document.getElementById("skip"),
};

const queue = [];
let stagesRemaining = 0;
let stageFinished = false;
let pendingResolve = null;
let transitionToken = 0;

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
  for (const taskElement of elements.container.querySelectorAll(".lesson-task")) {
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
  const previousTask = elements.container.querySelector(".lesson-task.is-active")
    || elements.container.querySelector(".lesson-task");
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
  elements.continueBtn.disabled = true;

  if (queue.length === 0) {
    if (lessonComplete()) return [true, () => true];
    elements.skipBtn.disabled = true;  // TODO make it enable again
    showLoadingScreen(elements);
    await new Promise((resolve) => { pendingResolve = resolve; });
  }

  const { exercise_id, content } = queue.shift();
  const verifier = taskControllers[exercise_id].loadTask(elements, mountTask, content);

  const isFinalInStage = stageFinished && queue.length === 0;
  if (isFinalInStage) stageFinished = false;
  return [isFinalInStage, verifier];
}
