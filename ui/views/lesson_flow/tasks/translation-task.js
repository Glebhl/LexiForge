(function registerTranslationTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;
  const WORD_BANK_MODE = "word-bank";
  const TYPING_MODE = "typing";

  let nextTranslationWordId = 0;

  const translationSession = {
    answerArea: null,
    keyboardArea: null,
    mode: WORD_BANK_MODE,
    rootElement: null,
    selectedWordIds: [],
    typingInput: null,
  };

  function resetSession(rootElement, answerArea, keyboardArea, typingInput) {
    translationSession.answerArea = answerArea;
    translationSession.keyboardArea = keyboardArea;
    translationSession.mode = WORD_BANK_MODE;
    translationSession.rootElement = rootElement;
    translationSession.selectedWordIds = [];
    translationSession.typingInput = typingInput;
  }

  function createKeyboardWord(text) {
    nextTranslationWordId += 1;
    return utils.createWordKey(text, nextTranslationWordId);
  }

  function removeSelectedWordId(wordId) {
    const selectedWordIds = translationSession.selectedWordIds;

    for (let index = 0; index < selectedWordIds.length; index += 1) {
      if (selectedWordIds[index] === wordId) {
        selectedWordIds.splice(index, 1);
        return;
      }
    }
  }

  function getWordBankAnswerText() {
    if (!translationSession.answerArea) {
      return "";
    }

    const answerKeyElements = translationSession.answerArea.querySelectorAll(".task-key");
    const textById = new Map();

    for (const keyElement of answerKeyElements) {
      textById.set(keyElement.dataset.id, utils.normalizeInlineText(keyElement.textContent));
    }

    const answerWords = [];

    for (const wordId of translationSession.selectedWordIds) {
      const word = textById.get(wordId);

      if (word) {
        answerWords.push(word);
      }
    }

    return utils.normalizeInlineText(answerWords.join(" "));
  }

  function getTypingAnswerText() {
    return utils.normalizeInlineText(
      translationSession.typingInput ? translationSession.typingInput.value : "",
    );
  }

  function updateContinueState() {
    if (translationSession.mode === TYPING_MODE) {
      utils.setContinueEnabled(getTypingAnswerText().length > 0);
      return;
    }

    utils.setContinueEnabled(translationSession.selectedWordIds.length > 0);
  }

  function switchMode(nextMode) {
    const mode = nextMode === TYPING_MODE ? TYPING_MODE : WORD_BANK_MODE;
    const isWordBankMode = mode === WORD_BANK_MODE;

    translationSession.mode = mode;
    translationSession.rootElement.classList.toggle("is-translation-word-bank", isWordBankMode);
    translationSession.rootElement.classList.toggle("is-translation-typing", !isWordBankMode);

    if (!isWordBankMode && translationSession.typingInput) {
      if (utils.normalizeInlineText(translationSession.typingInput.value).length === 0) {
        translationSession.typingInput.value = getWordBankAnswerText();
      }

      translationSession.typingInput.focus();
    }

    updateContinueState();
  }

  function handleWordClick(event) {
    if (translationSession.mode !== WORD_BANK_MODE) {
      return;
    }

    const keyElement = event.target.closest(".task-key");

    if (!keyElement) {
      return;
    }

    const isInKeyboard = translationSession.keyboardArea.contains(keyElement);
    const wordId = keyElement.dataset.id;

    utils.runFlipAnimation(
      [translationSession.keyboardArea, translationSession.answerArea],
      function () {
        if (isInKeyboard) {
          translationSession.answerArea.append(keyElement);
          translationSession.selectedWordIds.push(wordId);
        } else {
          translationSession.keyboardArea.append(keyElement);
          removeSelectedWordId(wordId);
        }

        updateContinueState();
      },
    );
  }

  function mount(rootElement, payload) {
    const answerArea = rootElement.querySelector(".task-answer--translation");
    const keyboardArea = rootElement.querySelector(".task-keyboard");
    const typingInput = rootElement.querySelector(".task-answer__typing-input");
    const modeSwitchRoot = rootElement.querySelector(".task-keyboard__mode-switch");
    const promptElement = rootElement.querySelector(".translation-prompt");
    const keyboardWords = Array.isArray(payload && payload.keyboard) ? payload.keyboard : [];
    const initialMode = payload && payload.mode ? payload.mode : WORD_BANK_MODE;

    resetSession(rootElement, answerArea, keyboardArea, typingInput);

    promptElement.textContent = payload && payload.sentence ? String(payload.sentence) : "";
    answerArea.replaceChildren();
    keyboardArea.replaceChildren();

    for (const word of keyboardWords) {
      keyboardArea.append(createKeyboardWord(word));
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);
    typingInput.addEventListener("input", updateContinueState);

    globalObject.lessonModeSwitch.attach(modeSwitchRoot, switchMode, initialMode);
    updateContinueState();
  }

  function highlightTranslation(isCorrect) {
    if (!translationSession.rootElement) {
      return;
    }

    const shellElement = translationSession.rootElement.querySelector(
      ".task-answer-shell--translation",
    );

    if (shellElement) {
      shellElement.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
    }
  }

  globalObject.lessonTaskRegistry.register("translation", {
    mount: mount,
  });
  globalObject.getTranslationAnswerString = function getTranslationAnswerString() {
    return translationSession.mode === TYPING_MODE
      ? getTypingAnswerText()
      : getWordBankAnswerText();
  };
  globalObject.highlightTranslation = highlightTranslation;
  globalObject.initTranslation = function initTranslation(
    rootElement,
    sentenceText,
    keyboardWords,
    initialMode,
  ) {
    mount(rootElement, {
      keyboard: keyboardWords,
      mode: initialMode,
      sentence: sentenceText,
    });
    return highlightTranslation;
  };
})(window);

