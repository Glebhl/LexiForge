(function registerFillingTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;
  const WORD_BANK_MODE = "word-bank";
  const TYPING_MODE = "typing";

  let nextBlankWordId = 0;

  const fillingSession = {
    answerArea: null,
    assignedWordIdsByBlank: [],
    blankSlots: [],
    keyboardArea: null,
    mode: WORD_BANK_MODE,
    rootElement: null,
  };

  function resetSession(rootElement, answerArea, keyboardArea) {
    fillingSession.answerArea = answerArea;
    fillingSession.assignedWordIdsByBlank = [];
    fillingSession.blankSlots = [];
    fillingSession.keyboardArea = keyboardArea;
    fillingSession.mode = WORD_BANK_MODE;
    fillingSession.rootElement = rootElement;
  }

  function createSentenceTextNode(text) {
    const textElement = document.createElement("span");

    textElement.className = "filling-text";
    textElement.textContent = text === undefined ? "" : String(text);

    return textElement;
  }

  function createBlankSlot() {
    const blankElement = document.createElement("span");
    const inputWrapElement = document.createElement("span");
    const inputElement = document.createElement("input");

    blankElement.className = "task-blank";
    inputWrapElement.className = "task-blank__input-wrap";
    inputElement.className = "task-blank__input";
    inputElement.type = "text";
    inputElement.autocomplete = "off";
    inputElement.spellcheck = false;

    inputWrapElement.append(inputElement);
    blankElement.append(inputWrapElement);

    return blankElement;
  }

  function createKeyboardWord(text) {
    nextBlankWordId += 1;
    return utils.createWordKey(text, nextBlankWordId);
  }

  function getBlankTypingValue(index) {
    const inputElement = fillingSession.blankSlots[index]
      ? fillingSession.blankSlots[index].querySelector(".task-blank__input")
      : null;

    return utils.normalizeInlineText(inputElement ? inputElement.value : "");
  }

  function getBlankWordBankValue(index) {
    const wordId = fillingSession.assignedWordIdsByBlank[index];

    if (!wordId || !fillingSession.answerArea) {
      return "";
    }

    const wordElement = fillingSession.answerArea.querySelector(
      '.task-key[data-id="' + String(wordId) + '"]',
    );

    return utils.normalizeInlineText(wordElement ? wordElement.textContent : "");
  }

  function updateContinueState() {
    if (fillingSession.blankSlots.length === 0) {
      utils.setContinueEnabled(true);
      return;
    }

    if (fillingSession.mode === TYPING_MODE) {
      for (let index = 0; index < fillingSession.blankSlots.length; index += 1) {
        if (getBlankTypingValue(index).length === 0) {
          utils.setContinueEnabled(false);
          return;
        }
      }

      utils.setContinueEnabled(true);
      return;
    }

    for (const wordId of fillingSession.assignedWordIdsByBlank) {
      if (wordId === null) {
        utils.setContinueEnabled(false);
        return;
      }
    }

    utils.setContinueEnabled(true);
  }

  function getFirstEmptyBlankIndex() {
    for (let index = 0; index < fillingSession.assignedWordIdsByBlank.length; index += 1) {
      if (fillingSession.assignedWordIdsByBlank[index] === null) {
        return index;
      }
    }

    return -1;
  }

  function findBlankIndexByWordId(wordId) {
    for (let index = 0; index < fillingSession.assignedWordIdsByBlank.length; index += 1) {
      if (fillingSession.assignedWordIdsByBlank[index] === wordId) {
        return index;
      }
    }

    return -1;
  }

  function syncTypingInputsFromWordBank() {
    for (let index = 0; index < fillingSession.blankSlots.length; index += 1) {
      const inputElement = fillingSession.blankSlots[index].querySelector(".task-blank__input");

      if (inputElement) {
        inputElement.value = getBlankWordBankValue(index);
      }
    }
  }

  function focusFirstBlankInput() {
    const firstInput = fillingSession.rootElement.querySelector(".task-blank__input");

    if (firstInput) {
      firstInput.focus();
    }
  }

  function switchMode(nextMode) {
    const mode = nextMode === TYPING_MODE ? TYPING_MODE : WORD_BANK_MODE;
    const isWordBankMode = mode === WORD_BANK_MODE;

    fillingSession.mode = mode;
    fillingSession.rootElement.classList.toggle("is-filling-word-bank", isWordBankMode);
    fillingSession.rootElement.classList.toggle("is-filling-typing", !isWordBankMode);

    if (!isWordBankMode) {
      syncTypingInputsFromWordBank();
      focusFirstBlankInput();
    }

    updateContinueState();
  }

  function handleWordClick(event) {
    if (fillingSession.mode !== WORD_BANK_MODE) {
      return;
    }

    const wordElement = event.target.closest(".task-key");

    if (!wordElement) {
      return;
    }

    const isInKeyboard = fillingSession.keyboardArea.contains(wordElement);
    const wordId = wordElement.dataset.id;

    utils.runFlipAnimation(
      [fillingSession.keyboardArea, fillingSession.answerArea],
      function () {
        if (isInKeyboard) {
          const blankIndex = getFirstEmptyBlankIndex();

          if (blankIndex === -1) {
            return;
          }

          fillingSession.blankSlots[blankIndex].append(wordElement);
          fillingSession.assignedWordIdsByBlank[blankIndex] = wordId;
        } else {
          const blankIndex = findBlankIndexByWordId(wordId);

          if (blankIndex !== -1) {
            fillingSession.assignedWordIdsByBlank[blankIndex] = null;
          }

          fillingSession.keyboardArea.append(wordElement);
        }

        updateContinueState();
      },
    );
  }

  function buildAnswerLayout(answerArea, sentenceParts) {
    for (let index = 0; index < sentenceParts.length; index += 1) {
      answerArea.append(createSentenceTextNode(sentenceParts[index]));

      if (index !== sentenceParts.length - 1) {
        answerArea.append(createBlankSlot());
      }
    }
  }

  function mount(rootElement, payload) {
    const answerArea = rootElement.querySelector(".task-answer--filling");
    const keyboardArea = rootElement.querySelector(".task-keyboard");
    const modeSwitchRoot = rootElement.querySelector(".task-keyboard__mode-switch");
    const sentenceParts = Array.isArray(payload && payload.sentence) ? payload.sentence : [];
    const keyboardWords = Array.isArray(payload && payload.keyboard) ? payload.keyboard : [];
    const initialMode = payload && payload.mode ? payload.mode : WORD_BANK_MODE;

    resetSession(rootElement, answerArea, keyboardArea);

    answerArea.replaceChildren();
    keyboardArea.replaceChildren();
    buildAnswerLayout(answerArea, sentenceParts);

    fillingSession.blankSlots = Array.from(answerArea.querySelectorAll(".task-blank"));
    fillingSession.assignedWordIdsByBlank = Array(fillingSession.blankSlots.length).fill(null);

    for (const word of keyboardWords) {
      keyboardArea.append(createKeyboardWord(word));
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);

    for (const blankSlot of fillingSession.blankSlots) {
      const inputElement = blankSlot.querySelector(".task-blank__input");

      if (inputElement) {
        inputElement.addEventListener("input", updateContinueState);
      }
    }

    globalObject.lessonModeSwitch.attach(modeSwitchRoot, switchMode, initialMode);
    updateContinueState();
  }

  function getFillingAnswerString() {
    if (fillingSession.mode === TYPING_MODE) {
      const typedAnswers = [];

      for (let index = 0; index < fillingSession.blankSlots.length; index += 1) {
        typedAnswers.push(getBlankTypingValue(index));
      }

      return JSON.stringify(typedAnswers);
    }

    const selectedAnswers = [];

    for (let index = 0; index < fillingSession.assignedWordIdsByBlank.length; index += 1) {
      const value = getBlankWordBankValue(index);

      if (value) {
        selectedAnswers.push(value);
      }
    }

    return JSON.stringify(selectedAnswers);
  }

  function highlightFilling(isCorrect) {
    if (!fillingSession.rootElement) {
      return;
    }

    const shellElement = fillingSession.rootElement.querySelector(".task-answer-shell--filling");

    if (shellElement) {
      shellElement.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
    }
  }

  globalObject.lessonTaskRegistry.register("filling", {
    mount: mount,
  });
  globalObject.getFillingAnswerString = getFillingAnswerString;
  globalObject.highlightFilling = highlightFilling;
  globalObject.initFillBlanks = function initFillBlanks(
    rootElement,
    sentenceParts,
    keyboardWords,
    initialMode,
  ) {
    mount(rootElement, {
      keyboard: keyboardWords,
      mode: initialMode,
      sentence: sentenceParts,
    });
  };
})(window);
