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
    let activeDrag = null;
    let suppressWordClick = false;

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

    function syncAssignedWordIdsFromDom() {
      state.assignedWordIdsByBlank = blankSlots.map(function (blankSlot) {
        const wordElement = blankSlot.querySelector(".task-key");
        return wordElement ? wordElement.dataset.id : null;
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

    function commitWordBankMutation(mutateDom) {
      utils.runFlipAnimation([keyboardArea, answerArea], function () {
        mutateDom();
        syncAssignedWordIdsFromDom();
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

      for (const blankSlot of blankSlots) {
        blankSlot.classList.remove("is-drop-target");
      }
    }

    function settleDraggedWord(dragState, mutateDom) {
      utils.settleFloatingWordDrag(dragState, [keyboardArea, answerArea], function () {
        clearDragDropState();
        mutateDom();
        syncAssignedWordIdsFromDom();
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

    function moveWordToBlank(wordElement, targetBlank) {
      const sourceBlank = wordElement.closest(".task-blank");
      const existingWord = targetBlank.querySelector(".task-key");

      if (existingWord && existingWord !== wordElement) {
        if (sourceBlank && sourceBlank !== targetBlank) {
          sourceBlank.append(existingWord);
        } else {
          keyboardArea.append(existingWord);
        }
      }

      targetBlank.append(wordElement);
    }

    function moveDraggedWordToBlank(dragState) {
      settleDraggedWord(dragState, function () {
        moveWordToBlank(dragState.wordElement, dragState.dropBlank);
        dragState.placeholder.remove();
      });
    }

    function moveDraggedWordToKeyboard(dragState) {
      settleDraggedWord(dragState, function () {
        dragState.placeholder.remove();
        keyboardArea.append(dragState.wordElement);
      });
    }

    function updateDragTarget(dragState, pointerX, pointerY) {
      let hoveredBlank = null;

      for (const blankSlot of blankSlots) {
        if (utils.isPointInsideElement(blankSlot, pointerX, pointerY)) {
          hoveredBlank = blankSlot;
          break;
        }
      }

      dragState.dropBlank = hoveredBlank;
      keyboardArea.classList.toggle("is-drop-target", utils.isPointInsideElement(keyboardArea, pointerX, pointerY));

      for (const blankSlot of blankSlots) {
        blankSlot.classList.toggle("is-drop-target", blankSlot === hoveredBlank);
      }
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
      } else if (dragState.dropBlank) {
        const sourceBlank = dragState.restoreParent.closest(".task-blank");

        if (sourceBlank === dragState.dropBlank) {
          restoreDraggedWord(dragState);
        } else {
          moveDraggedWordToBlank(dragState);
        }
      } else if (
        utils.isPointInsideElement(keyboardArea, pointerEvent.clientX, pointerEvent.clientY) &&
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

      activeDrag.lastX = event.clientX;
      activeDrag.lastY = event.clientY;

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
        } else {
          const blankIndex = findBlankIndexByWordId(wordId);

          if (blankIndex !== -1) {
            blankSlots[blankIndex].removeChild(wordElement);
          }

          keyboardArea.append(wordElement);
        }

        syncAssignedWordIdsFromDom();
        updateContinueState();
      });
    }

    function handlePointerDown(event) {
      if (state.mode !== WORD_BANK_MODE || event.button !== 0) {
        return;
      }

      const wordElement = event.target.closest(".task-key");

      if (!wordElement || !rootElement.contains(wordElement)) {
        return;
      }

      event.preventDefault();

      activeDrag = {
        didStart: false,
        dropBlank: null,
        lastX: event.clientX,
        lastY: event.clientY,
        pointerId: event.pointerId,
        restoreBeforeNode: wordElement.nextSibling,
        restoreParent: wordElement.parentNode,
        startX: event.clientX,
        startY: event.clientY,
        wordElement: wordElement,
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, true);
      window.addEventListener("pointercancel", handlePointerCancel, true);
    }

    rootElement.addEventListener("pointerdown", handlePointerDown);
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
