(function registerFillingTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;
  const WORD_BANK_MODE = "word-bank";
  const TYPING_MODE = "typing";

  let nextBlankWordId = 0;

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

  function buildAnswerLayout(answerArea, sentenceParts) {
    for (let index = 0; index < sentenceParts.length; index += 1) {
      answerArea.append(createSentenceTextNode(sentenceParts[index]));

      if (index !== sentenceParts.length - 1) {
        answerArea.append(createBlankSlot());
      }
    }
  }

  function createTaskController(rootElement, payload) {
    const answerArea = rootElement.querySelector(".task-answer--filling");
    const keyboardArea = rootElement.querySelector(".task-keyboard");
    const modeSwitchRoot = rootElement.querySelector(".task-keyboard__mode-switch");
    const sentenceParts = Array.isArray(payload.sentence) ? payload.sentence : [];
    const keyboardWords = Array.isArray(payload.keyboard) ? payload.keyboard : [];
    const initialMode = payload.mode || WORD_BANK_MODE;

    answerArea.replaceChildren();
    keyboardArea.replaceChildren();
    buildAnswerLayout(answerArea, sentenceParts);

    const blankSlots = Array.from(answerArea.querySelectorAll(".task-blank"));
    const state = {
      assignedWordIdsByBlank: Array(blankSlots.length).fill(null),
      mode: WORD_BANK_MODE,
    };

    for (const word of keyboardWords) {
      keyboardArea.append(createKeyboardWord(word));
    }

    function getBlankTypingValue(index) {
      const inputElement = blankSlots[index]
        ? blankSlots[index].querySelector(".task-blank__input")
        : null;

      return utils.normalizeInlineText(inputElement ? inputElement.value : "");
    }

    function getBlankWordBankValue(index) {
      const wordId = state.assignedWordIdsByBlank[index];

      if (!wordId) {
        return "";
      }

      const wordElement = answerArea.querySelector(
        '.task-key[data-id="' + String(wordId) + '"]',
      );

      return utils.normalizeInlineText(wordElement ? wordElement.textContent : "");
    }

    function updateContinueState() {
      if (blankSlots.length === 0) {
        utils.setContinueEnabled(true);
        return;
      }

      if (state.mode === TYPING_MODE) {
        const allBlanksFilled = blankSlots.every(function (_, index) {
          return getBlankTypingValue(index).length > 0;
        });

        utils.setContinueEnabled(allBlanksFilled);
        return;
      }

      const allWordsAssigned = state.assignedWordIdsByBlank.every(function (wordId) {
        return wordId !== null;
      });

      utils.setContinueEnabled(allWordsAssigned);
    }

    function getFirstEmptyBlankIndex() {
      return state.assignedWordIdsByBlank.findIndex(function (wordId) {
        return wordId === null;
      });
    }

    function findBlankIndexByWordId(wordId) {
      return state.assignedWordIdsByBlank.findIndex(function (assignedWordId) {
        return assignedWordId === wordId;
      });
    }

    function syncTypingInputsFromWordBank() {
      blankSlots.forEach(function (blankSlot, index) {
        const inputElement = blankSlot.querySelector(".task-blank__input");

        if (inputElement) {
          inputElement.value = getBlankWordBankValue(index);
        }
      });
    }

    function switchMode(nextMode) {
      const isTypingMode = nextMode === TYPING_MODE;

      state.mode = isTypingMode ? TYPING_MODE : WORD_BANK_MODE;
      rootElement.classList.toggle("is-filling-word-bank", !isTypingMode);
      rootElement.classList.toggle("is-filling-typing", isTypingMode);

      if (isTypingMode) {
        syncTypingInputsFromWordBank();

        const firstInput = rootElement.querySelector(".task-blank__input");
        if (firstInput) {
          firstInput.focus();
        }
      }

      updateContinueState();
    }

    function handleWordClick(event) {
      if (state.mode !== WORD_BANK_MODE) {
        return;
      }

      const wordElement = event.target.closest(".task-key");

      if (!wordElement) {
        return;
      }

      const wordId = wordElement.dataset.id;
      const isInKeyboard = keyboardArea.contains(wordElement);

      utils.runFlipAnimation([keyboardArea, answerArea], function () {
        if (isInKeyboard) {
          const blankIndex = getFirstEmptyBlankIndex();

          if (blankIndex === -1) {
            return;
          }

          blankSlots[blankIndex].append(wordElement);
          state.assignedWordIdsByBlank[blankIndex] = wordId;
        } else {
          const blankIndex = findBlankIndexByWordId(wordId);

          if (blankIndex !== -1) {
            state.assignedWordIdsByBlank[blankIndex] = null;
          }

          keyboardArea.append(wordElement);
        }

        updateContinueState();
      });
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);

    for (const blankSlot of blankSlots) {
      const inputElement = blankSlot.querySelector(".task-blank__input");

      if (inputElement) {
        inputElement.addEventListener("input", updateContinueState);
      }
    }

    globalObject.lessonModeSwitch.attach(modeSwitchRoot, switchMode, initialMode);
    updateContinueState();

    return {
      getAnswer: function () {
        const values = blankSlots.map(function (_, index) {
          return state.mode === TYPING_MODE
            ? getBlankTypingValue(index)
            : getBlankWordBankValue(index);
        });

        return JSON.stringify(values);
      },
      setValidity: function (isCorrect) {
        const shellElement = rootElement.querySelector(".task-answer-shell--filling");

        if (shellElement) {
          shellElement.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
        }
      },
    };
  }

  globalObject.lessonTaskRegistry.register("filling", createTaskController);
})(window);
