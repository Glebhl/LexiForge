(function registerTranslationTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;
  const WORD_BANK_MODE = "word-bank";
  const TYPING_MODE = "typing";

  let nextTranslationWordId = 0;

  function createKeyboardWord(text) {
    nextTranslationWordId += 1;
    return utils.createWordKey(text, nextTranslationWordId);
  }

  function createTaskController(rootElement, payload) {
    const answerArea = rootElement.querySelector(".task-answer--translation");
    const keyboardArea = rootElement.querySelector(".task-keyboard");
    const typingInput = rootElement.querySelector(".task-answer__typing-input");
    const modeSwitchRoot = rootElement.querySelector(".task-keyboard__mode-switch");
    const promptElement = rootElement.querySelector(".translation-prompt");
    const keyboardWords = Array.isArray(payload.keyboard) ? payload.keyboard : [];
    const initialMode = payload.mode || WORD_BANK_MODE;
    const state = {
      mode: WORD_BANK_MODE,
      selectedWordIds: [],
    };

    promptElement.textContent = payload.sentence ? String(payload.sentence) : "";
    answerArea.replaceChildren();
    keyboardArea.replaceChildren();

    for (const word of keyboardWords) {
      keyboardArea.append(createKeyboardWord(word));
    }

    function removeSelectedWordId(wordId) {
      state.selectedWordIds = state.selectedWordIds.filter(function (id) {
        return id !== wordId;
      });
    }

    function getWordBankAnswerText() {
      const answerWords = Array.from(answerArea.querySelectorAll(".task-key")).map(
        function (keyElement) {
          return utils.normalizeInlineText(keyElement.textContent);
        },
      );

      return utils.normalizeInlineText(answerWords.join(" "));
    }

    function getTypingAnswerText() {
      return utils.normalizeInlineText(typingInput ? typingInput.value : "");
    }

    function updateContinueState() {
      if (state.mode === TYPING_MODE) {
        utils.setContinueEnabled(getTypingAnswerText().length > 0);
        return;
      }

      utils.setContinueEnabled(state.selectedWordIds.length > 0);
    }

    function switchMode(nextMode) {
      const isTypingMode = nextMode === TYPING_MODE;

      state.mode = isTypingMode ? TYPING_MODE : WORD_BANK_MODE;
      rootElement.classList.toggle("is-translation-word-bank", !isTypingMode);
      rootElement.classList.toggle("is-translation-typing", isTypingMode);

      if (isTypingMode && typingInput) {
        if (getTypingAnswerText().length === 0) {
          typingInput.value = getWordBankAnswerText();
        }

        typingInput.focus();
      }

      updateContinueState();
    }

    function handleWordClick(event) {
      if (state.mode !== WORD_BANK_MODE) {
        return;
      }

      const keyElement = event.target.closest(".task-key");

      if (!keyElement) {
        return;
      }

      const wordId = keyElement.dataset.id;
      const isInKeyboard = keyboardArea.contains(keyElement);

      utils.runFlipAnimation([keyboardArea, answerArea], function () {
        if (isInKeyboard) {
          answerArea.append(keyElement);
          state.selectedWordIds.push(wordId);
        } else {
          keyboardArea.append(keyElement);
          removeSelectedWordId(wordId);
        }

        updateContinueState();
      });
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);
    typingInput.addEventListener("input", updateContinueState);

    globalObject.lessonModeSwitch.attach(modeSwitchRoot, switchMode, initialMode);
    updateContinueState();

    return {
      getAnswer: function () {
        return state.mode === TYPING_MODE ? getTypingAnswerText() : getWordBankAnswerText();
      },
      setValidity: function (isCorrect) {
        const shellElement = rootElement.querySelector(".task-answer-shell--translation");

        if (shellElement) {
          shellElement.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
        }
      },
    };
  }

  globalObject.lessonTaskRegistry.register("translation", createTaskController);
})(window);
