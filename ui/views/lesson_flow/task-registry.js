(function registerLessonTaskRegistry(globalObject) {
  const taskModules = {};

  function registerTask(type, taskModule) {
    taskModules[type] = taskModule;
  }

  function getTask(type) {
    return taskModules[type] || null;
  }

  globalObject.lessonTaskRegistry = {
    get: getTask,
    register: registerTask,
  };
})(window);
