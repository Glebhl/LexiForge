(function registerMatchingTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;

  function createChoice(text, pairId, side) {
    const choiceElement = utils.cloneTemplateElement("tpl-matching-choice", ".task-choice");

    choiceElement.className = "task-choice is-idle";
    choiceElement.textContent = String(text);
    choiceElement.dataset.pairId = String(pairId);
    choiceElement.dataset.side = side;

    return choiceElement;
  }

  function setChoiceState(choiceElement, stateName) {
    choiceElement.className = "task-choice";
    choiceElement.classList.add(stateName);
  }

  function normalizePairText(value) {
    return value === undefined ? "" : String(value);
  }

  function createTaskController(rootElement, payload) {
    const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
    const gridElement = rootElement.querySelector(".matching-grid");
    const leftColumn = rootElement.querySelector(".matching-grid__column--left");
    const rightColumn = rootElement.querySelector(".matching-grid__column--right");
    const state = {
      selectedBySide: {
        left: null,
        right: null,
      },
      solvedPairCount: 0,
      totalPairCount: pairs.length,
    };

    leftColumn.replaceChildren();
    rightColumn.replaceChildren();
    utils.setContinueEnabled(pairs.length === 0);

    const rightChoices = pairs.map(function (pair, pairIndex) {
      const normalizedPair = Array.isArray(pair) ? pair : [];

      leftColumn.append(createChoice(normalizePairText(normalizedPair[0]), pairIndex, "left"));

      return {
        pairId: pairIndex,
        text: normalizePairText(normalizedPair[1]),
      };
    });

    utils.shuffleInPlace(rightChoices);

    for (const choice of rightChoices) {
      rightColumn.append(createChoice(choice.text, choice.pairId, "right"));
    }

    function clearSelection(side) {
      const selectedChoice = state.selectedBySide[side];

      if (selectedChoice) {
        setChoiceState(selectedChoice, "is-idle");
        state.selectedBySide[side] = null;
      }
    }

    function markPairResult(leftChoice, rightChoice, isCorrect) {
      setChoiceState(leftChoice, isCorrect ? "is-correct" : "is-wrong");
      setChoiceState(rightChoice, isCorrect ? "is-correct" : "is-wrong");

      if (isCorrect) {
        state.solvedPairCount += 1;

        if (state.solvedPairCount === state.totalPairCount) {
          utils.setContinueEnabled(true);
        }
      }

      state.selectedBySide.left = null;
      state.selectedBySide.right = null;
    }

    function evaluateSelection() {
      const leftChoice = state.selectedBySide.left;
      const rightChoice = state.selectedBySide.right;

      if (!leftChoice || !rightChoice) {
        return;
      }

      markPairResult(
        leftChoice,
        rightChoice,
        leftChoice.dataset.pairId === rightChoice.dataset.pairId,
      );
    }

    function handleChoiceClick(choiceElement) {
      if (choiceElement.classList.contains("is-correct")) {
        return;
      }

      const side = choiceElement.dataset.side;

      if (!side) {
        return;
      }

      if (choiceElement.classList.contains("is-selected")) {
        clearSelection(side);
        return;
      }

      clearSelection(side);
      state.selectedBySide[side] = choiceElement;
      setChoiceState(choiceElement, "is-selected");
      evaluateSelection();
    }

    gridElement.addEventListener("click", function (event) {
      const choiceElement = event.target.closest(".task-choice");

      if (choiceElement) {
        handleChoiceClick(choiceElement);
      }
    });

    return {};
  }

  globalObject.lessonTaskRegistry.register("matching", createTaskController);
})(window);
