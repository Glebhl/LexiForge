(function registerMatchingTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;

  const matchingSession = {
    mistakeCount: 0,
    selectedLeftChoice: null,
    selectedRightChoice: null,
    solvedPairCount: 0,
    totalPairCount: 0,
  };

  function resetSession() {
    matchingSession.mistakeCount = 0;
    matchingSession.selectedLeftChoice = null;
    matchingSession.selectedRightChoice = null;
    matchingSession.solvedPairCount = 0;
    matchingSession.totalPairCount = 0;
  }

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

  function getSelectedChoice(side) {
    return side === "left"
      ? matchingSession.selectedLeftChoice
      : matchingSession.selectedRightChoice;
  }

  function setSelectedChoice(side, choiceElement) {
    if (side === "left") {
      matchingSession.selectedLeftChoice = choiceElement;
      return;
    }

    matchingSession.selectedRightChoice = choiceElement;
  }

  function markResolvedPair() {
    matchingSession.solvedPairCount += 1;

    if (matchingSession.solvedPairCount === matchingSession.totalPairCount) {
      utils.setContinueEnabled(true);
    }
  }

  function evaluateSelection() {
    const leftChoice = matchingSession.selectedLeftChoice;
    const rightChoice = matchingSession.selectedRightChoice;

    if (!leftChoice || !rightChoice) {
      return;
    }

    const isMatch = leftChoice.dataset.pairId === rightChoice.dataset.pairId;

    if (isMatch) {
      setChoiceState(leftChoice, "is-correct");
      setChoiceState(rightChoice, "is-correct");
      markResolvedPair();
    } else {
      matchingSession.mistakeCount += 1;
      setChoiceState(leftChoice, "is-wrong");
      setChoiceState(rightChoice, "is-wrong");
    }

    matchingSession.selectedLeftChoice = null;
    matchingSession.selectedRightChoice = null;
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
      setChoiceState(choiceElement, "is-idle");
      setSelectedChoice(side, null);
      return;
    }

    const previousChoice = getSelectedChoice(side);

    if (previousChoice && previousChoice !== choiceElement) {
      setChoiceState(previousChoice, "is-idle");
    }

    setSelectedChoice(side, choiceElement);
    setChoiceState(choiceElement, "is-selected");
    evaluateSelection();
  }

  function mount(rootElement, payload) {
    const pairs = Array.isArray(payload && payload.pairs) ? payload.pairs : [];
    const gridElement = rootElement.querySelector(".matching-grid");
    const leftColumn = rootElement.querySelector(".matching-grid__column--left");
    const rightColumn = rootElement.querySelector(".matching-grid__column--right");
    const rightChoices = [];

    leftColumn.replaceChildren();
    rightColumn.replaceChildren();
    resetSession();

    matchingSession.totalPairCount = pairs.length;
    utils.setContinueEnabled(pairs.length === 0);

    for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
      const pair = Array.isArray(pairs[pairIndex]) ? pairs[pairIndex] : [];
      const leftText = pair[0] === undefined ? "" : String(pair[0]);
      const rightText = pair[1] === undefined ? "" : String(pair[1]);

      leftColumn.append(createChoice(leftText, pairIndex, "left"));
      rightChoices.push({ pairId: pairIndex, text: rightText });
    }

    utils.shuffleInPlace(rightChoices);

    for (const choice of rightChoices) {
      rightColumn.append(createChoice(choice.text, choice.pairId, "right"));
    }

    gridElement.addEventListener("click", function (event) {
      const choiceElement = event.target.closest(".task-choice");

      if (choiceElement) {
        handleChoiceClick(choiceElement);
      }
    });
  }

  globalObject.lessonTaskRegistry.register("matching", {
    mount: mount,
  });
  globalObject.getMatchingResults = function getMatchingResults() {
    return matchingSession.mistakeCount > 0;
  };
  globalObject.initMatching = function initMatching(element, pairs) {
    mount(element, { pairs: pairs });
  };
})(window);
