(function registerLessonModeSwitch(globalObject) {
  function createNoopController() {
    return {
      getMode: function () {
        return "";
      },
      setMode: function () {},
    };
  }

  function attachModeSwitch(rootElement, onModeChange, initialMode) {
    if (!rootElement) {
      return createNoopController();
    }

    const buttons = Array.from(
      rootElement.querySelectorAll(".task-keyboard__mode-button[data-mode]"),
    );

    if (buttons.length === 0) {
      return createNoopController();
    }

    let currentMode = "";

    function applyMode(mode, shouldNotify) {
      const nextMode = String(mode || "");
      const hasModeButton = buttons.some(function (button) {
        return button.dataset.mode === nextMode;
      });

      if (!hasModeButton) {
        return;
      }

      currentMode = nextMode;

      for (const button of buttons) {
        button.classList.toggle("is-active", button.dataset.mode === nextMode);
      }

      if (shouldNotify && typeof onModeChange === "function") {
        onModeChange(nextMode);
      }
    }

    for (const button of buttons) {
      button.addEventListener("click", function () {
        applyMode(button.dataset.mode, true);
      });
    }

    const fallbackMode = buttons[0].dataset.mode;
    const initialButton = buttons.find(function (button) {
      return button.dataset.mode === initialMode;
    });

    applyMode(initialButton ? initialButton.dataset.mode : fallbackMode, true);

    return {
      getMode: function () {
        return currentMode;
      },
      setMode: function (mode) {
        applyMode(mode, true);
      },
    };
  }

  globalObject.lessonModeSwitch = {
    attach: attachModeSwitch,
  };
})(window);
