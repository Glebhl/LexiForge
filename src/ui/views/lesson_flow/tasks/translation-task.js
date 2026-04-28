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
    let activeDrag = null;
    let suppressWordClick = false;

    promptElement.textContent = payload.sentence ? String(payload.sentence) : "";
    answerArea.replaceChildren();
    keyboardArea.replaceChildren();

    for (const word of keyboardWords) {
      keyboardArea.append(createKeyboardWord(word));
    }

    function syncSelectedWordIds() {
      state.selectedWordIds = Array.from(answerArea.querySelectorAll(".task-key")).map(function (
        keyElement,
      ) {
        return keyElement.dataset.id;
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

    function commitWordBankMutation(mutateDom) {
      utils.runFlipAnimation([keyboardArea, answerArea], function () {
        mutateDom();
        syncSelectedWordIds();
        updateContinueState();
      });
    }

    function insertAtRecordedLocation(parentElement, beforeNode, wordElement) {
      if (beforeNode && beforeNode.parentNode === parentElement) {
        parentElement.insertBefore(wordElement, beforeNode);
        return;
      }

      parentElement.append(wordElement);
    }

    function clearDragDropState() {
      keyboardArea.classList.remove("is-drop-target");
      answerArea.classList.remove("is-drop-target");
    }

    function settleDraggedWord(dragState, mutateDom) {
      utils.settleFloatingWordDrag(dragState, [keyboardArea, answerArea], function () {
        clearDragDropState();
        mutateDom();
        syncSelectedWordIds();
        updateContinueState();
      });
    }

    function restoreDraggedWord(dragState) {
      settleDraggedWord(dragState, function () {
        insertAtRecordedLocation(
          dragState.restoreParent,
          dragState.restoreBeforeNode,
          dragState.wordElement,
        );
        dragState.placeholder.remove();
      });
    }

    function moveDraggedWordToKeyboard(dragState) {
      settleDraggedWord(dragState, function () {
        dragState.placeholder.remove();
        keyboardArea.append(dragState.wordElement);
      });
    }

    function moveDraggedWordToAnswer(dragState) {
      settleDraggedWord(dragState, function () {
        dragState.placeholder.replaceWith(dragState.wordElement);
      });
    }

    function updateDragTarget(dragState, pointerX, pointerY) {
      const isOverAnswer = utils.isPointInsideElement(answerArea, pointerX, pointerY);
      const isOverKeyboard = utils.isPointInsideElement(keyboardArea, pointerX, pointerY);

      if (isOverAnswer) {
        const beforeNode = utils.findWordInsertBeforeNode(
          answerArea,
          pointerX,
          pointerY,
          dragState.wordElement,
        );

        const placeholderNeedsMove =
          dragState.placeholder.parentNode !== answerArea ||
          dragState.placeholder.nextSibling !== beforeNode;

        if (placeholderNeedsMove) {
          utils.runFlipAnimation([answerArea], function () {
            if (beforeNode) {
              answerArea.insertBefore(dragState.placeholder, beforeNode);
            } else {
              answerArea.append(dragState.placeholder);
            }
          }, 120);
        }

        dragState.dropTarget = "answer";
        return;
      }

      dragState.dropTarget = isOverKeyboard ? "keyboard" : null;
    }

    function finishDrag(pointerEvent, forceRestore) {
      if (!activeDrag) {
        return;
      }

      const dragState = activeDrag;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerCancel, true);

      if (!dragState.didStart) {
        activeDrag = null;
        return;
      }

      if (pointerEvent) {
        utils.moveFloatingWordDrag(dragState, pointerEvent.clientX, pointerEvent.clientY);
        updateDragTarget(dragState, pointerEvent.clientX, pointerEvent.clientY);
      }

      if (forceRestore) {
        restoreDraggedWord(dragState);
      } else if (dragState.dropTarget === "answer") {
        moveDraggedWordToAnswer(dragState);
      } else if (
        dragState.dropTarget === "keyboard" &&
        dragState.restoreParent !== keyboardArea
      ) {
        moveDraggedWordToKeyboard(dragState);
      } else {
        restoreDraggedWord(dragState);
      }

      activeDrag = null;
      suppressWordClick = true;

      window.setTimeout(function () {
        suppressWordClick = false;
      }, 0);
    }

    function handlePointerMove(event) {
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      if (!activeDrag.didStart) {
        const deltaX = event.clientX - activeDrag.startX;
        const deltaY = event.clientY - activeDrag.startY;
        const movedEnough = Math.hypot(deltaX, deltaY) >= 6;

        if (!movedEnough) {
          return;
        }

        activeDrag.didStart = true;
        Object.assign(activeDrag, utils.beginFloatingWordDrag(activeDrag.wordElement, event.clientX, event.clientY));
      }

      event.preventDefault();
      utils.moveFloatingWordDrag(activeDrag, event.clientX, event.clientY);
      updateDragTarget(activeDrag, event.clientX, event.clientY);
    }

    function handlePointerUp(event) {
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      finishDrag(event, false);
    }

    function handlePointerCancel(event) {
      if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
        return;
      }

      finishDrag(event, true);
    }

    function handleWordClick(event) {
      if (state.mode !== WORD_BANK_MODE) {
        return;
      }

      if (suppressWordClick) {
        event.preventDefault();
        return;
      }

      const keyElement = event.target.closest(".task-key");

      if (!keyElement) {
        return;
      }

      const isInKeyboard = keyboardArea.contains(keyElement);

      utils.runFlipAnimation([keyboardArea, answerArea], function () {
        if (isInKeyboard) {
          answerArea.append(keyElement);
        } else {
          keyboardArea.append(keyElement);
        }

        syncSelectedWordIds();
        updateContinueState();
      });
    }

    function handlePointerDown(event) {
      if (state.mode !== WORD_BANK_MODE || event.button !== 0) {
        return;
      }

      const keyElement = event.target.closest(".task-key");

      if (!keyElement || !rootElement.contains(keyElement)) {
        return;
      }

      event.preventDefault();

      activeDrag = {
        didStart: false,
        dropTarget: null,
        pointerId: event.pointerId,
        restoreBeforeNode: keyElement.nextSibling,
        restoreParent: keyElement.parentNode,
        startX: event.clientX,
        startY: event.clientY,
        wordElement: keyElement,
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, true);
      window.addEventListener("pointercancel", handlePointerCancel, true);
    }

    rootElement.addEventListener("pointerdown", handlePointerDown);
    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);
    if (typingInput) {
      typingInput.addEventListener("input", updateContinueState);
    }

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
