(function registerLessonShell(globalObject) {
  const utils = globalObject.lessonSharedUtils;
  const stageElement = document.getElementById("taskStage");
  const progressFillElement = document.getElementById("progressFill");
  const progressTextElement = document.getElementById("progressText");
  const continueButton = document.getElementById("continue");
  const skipButton = document.getElementById("skip");

  const shellState = {
    activeTaskElement: null,
    transitionFallbackMs: 500,
    transitionToken: 0,
  };

  function setStep(stepIndex, totalSteps) {
    const normalizedTotal = Number.isFinite(Number(totalSteps))
      ? Math.max(0, Number(totalSteps))
      : 0;
    const normalizedStep = Number.isFinite(Number(stepIndex))
      ? Math.max(0, Math.min(Number(stepIndex), normalizedTotal))
      : 0;
    const progressPercent =
      normalizedTotal === 0 ? 0 : (normalizedStep / normalizedTotal) * 100;

    progressFillElement.style.width = progressPercent + "%";
    progressTextElement.textContent = normalizedStep + " / " + normalizedTotal;
  }

  function createTaskElement(taskType) {
    return utils.cloneTemplateElement("tpl-" + taskType, ".lesson-task");
  }

  function getTaskTransitionClasses(direction) {
    if (direction === "prev") {
      return {
        incomingClassName: "is-enter-from-left",
        outgoingClassName: "is-enter-from-right",
      };
    }

    return {
      incomingClassName: "is-enter-from-right",
      outgoingClassName: "is-enter-from-left",
    };
  }

  function waitForTransition(element, timeoutMs) {
    return new Promise(function (resolve) {
      let finished = false;

      function finalize() {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeoutId);
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      }

      function handleTransitionEnd(event) {
        if (event.target === element && event.propertyName === "transform") {
          finalize();
        }
      }

      const timeoutId = setTimeout(finalize, timeoutMs);
      element.addEventListener("transitionend", handleTransitionEnd);
    });
  }

  function cleanupStage(keepElement) {
    const mountedTasks = stageElement.querySelectorAll(".lesson-task");

    for (const taskElement of mountedTasks) {
      if (taskElement !== keepElement) {
        taskElement.remove();
      }
    }
  }

  function mountTask(taskType, taskElement, payload) {
    const taskModule = globalObject.lessonTaskRegistry.get(taskType);

    if (!taskModule || typeof taskModule.mount !== "function") {
      throw new Error("Task_module_not_found:" + taskType);
    }

    taskModule.mount(taskElement, payload || {});
  }

  function setTask(taskType, direction, payload) {
    const transitionDirection = direction || "next";
    const nextTaskElement = createTaskElement(taskType);
    const previousTaskElement = shellState.activeTaskElement;
    const transitionToken = shellState.transitionToken + 1;
    const transitionClasses = getTaskTransitionClasses(transitionDirection);

    shellState.transitionToken = transitionToken;
    shellState.activeTaskElement = nextTaskElement;

    utils.setContinueEnabled(false);
    mountTask(taskType, nextTaskElement, payload || {});

    cleanupStage(previousTaskElement);

    nextTaskElement.classList.add(transitionClasses.incomingClassName);
    stageElement.append(nextTaskElement);

    void nextTaskElement.offsetWidth;

    nextTaskElement.classList.remove("is-enter-from-left", "is-enter-from-right");
    nextTaskElement.classList.add("is-active");

    if (previousTaskElement) {
      previousTaskElement.classList.remove("is-active");
      previousTaskElement.classList.add(transitionClasses.outgoingClassName);
    }

    return waitForTransition(nextTaskElement, shellState.transitionFallbackMs).then(function () {
      if (shellState.transitionToken !== transitionToken) {
        cleanupStage(shellState.activeTaskElement);
        return;
      }

      cleanupStage(nextTaskElement);
    });
  }

  function emitBackendEvent(eventName, payload) {
    if (globalObject.backend && typeof globalObject.backend.emitEvent === "function") {
      globalObject.backend.emitEvent(eventName, payload);
    }
  }

  continueButton.addEventListener("click", function () {
    emitBackendEvent("btn-click", { id: "continue" });
  });

  skipButton.addEventListener("click", function () {
    emitBackendEvent("btn-click", { id: "skip" });
  });

  globalObject.setStep = setStep;
  globalObject.setTask = setTask;
})(window);

// setTask(
//   "translation",
//   "next",
//   {
//     "sentence": "This is a very nice book.",
//     "keyboard": ["Это", "очень", "книга", "хорошая", "лишние", "три", "слова"],
//     "mode": "word-bank"
//   }
// )
