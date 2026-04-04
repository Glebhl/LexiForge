(function registerLoadingTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;

  function createTaskController(rootElement, payload) {
    const titleElement = rootElement.querySelector(".loading-title");
    const messageElement = rootElement.querySelector(".loading-message");

    titleElement.textContent = payload && payload.title ? String(payload.title) : "Loading";
    messageElement.textContent =
      payload && payload.message
        ? String(payload.message)
        : "Please wait while the lesson is being prepared.";

    utils.setContinueEnabled(false);
    return {};
  }

  globalObject.lessonTaskRegistry.register("loading", createTaskController);
})(window);
