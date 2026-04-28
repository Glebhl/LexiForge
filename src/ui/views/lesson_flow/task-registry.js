(function registerLessonTaskRegistry(globalObject) {
  const taskFactories = {};

  function registerTask(type, createTaskController) {
    taskFactories[type] = createTaskController;
  }

  function createTask(type, rootElement, payload) {
    const createTaskController = taskFactories[type];

    if (typeof createTaskController !== "function") {
      return null;
    }

    return createTaskController(rootElement, payload || {}) || {};
  }

  globalObject.lessonTaskRegistry = {
    create: createTask,
    register: registerTask,
  };
})(window);
