(function registerPywebviewBridge(globalObject) {
  const readyCallbacks = [];
  let isReady = false;

  function flushReadyCallbacks() {
    while (readyCallbacks.length > 0) {
      const callback = readyCallbacks.shift();
      if (typeof callback === "function") {
        callback();
      }
    }
  }

  function markReady() {
    if (!globalObject.pywebview || !globalObject.pywebview.api) {
      return;
    }

    isReady = true;
    flushReadyCallbacks();
  }

  function onReady(callback) {
    if (isReady) {
      callback();
      return;
    }

    readyCallbacks.push(callback);
    markReady();
  }

  function emitBackendEvent(eventName, payload) {
    if (
      globalObject.pywebview &&
      globalObject.pywebview.api &&
      typeof globalObject.pywebview.api.emit_event === "function"
    ) {
      return globalObject.pywebview.api.emit_event(eventName, payload || {});
    }

    return Promise.resolve(null);
  }

  function getState(key, fallbackValue) {
    if (
      !globalObject.pywebview ||
      !globalObject.pywebview.api ||
      typeof globalObject.pywebview.api.get_state !== "function"
    ) {
      return Promise.resolve(fallbackValue);
    }

    return globalObject.pywebview.api.get_state(key).then(function (value) {
      return value === undefined || value === null ? fallbackValue : value;
    });
  }

  function observeState(key, callback, fallbackValue, intervalMs) {
    onReady(function () {
      let lastSerialized = null;
      const pollIntervalMs = Number(intervalMs) > 0 ? Number(intervalMs) : 150;
      const warmupPollDelaysMs = [24, 72];

      function applyIfChanged(value) {
        const normalizedValue = value === undefined || value === null ? fallbackValue : value;
        const serializedValue = JSON.stringify(normalizedValue);

        if (serializedValue === lastSerialized) {
          return;
        }

        lastSerialized = serializedValue;
        callback(normalizedValue);
      }

      function poll() {
        getState(key, fallbackValue)
          .then(applyIfChanged)
          .catch(function () {
            applyIfChanged(fallbackValue);
          });
      }

      poll();
      warmupPollDelaysMs.forEach(function (delayMs) {
        globalObject.setTimeout(poll, delayMs);
      });
      globalObject.setInterval(poll, pollIntervalMs);
    });
  }

  globalObject.addEventListener("pywebviewready", markReady);
  markReady();

  globalObject.appBridge = {
    emitBackendEvent: emitBackendEvent,
    getState: getState,
    observeState: observeState,
    onReady: onReady,
  };
})(window);
