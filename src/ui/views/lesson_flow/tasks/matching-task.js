function normalizeText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function normalizePairs(content) {
  if (!Array.isArray(content?.pairs)) {
    return [];
  }

  return content.pairs.map((pair, index) => {
    const values = Array.isArray(pair) ? pair : [];

    return {
      id: index,
      left: normalizeText(values[0]),
      right: normalizeText(values[1]),
    };
  });
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffled[index];

    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = currentItem;
  }

  return shuffled;
}

function createChoice(text, pairId, side) {
  const choice = document.createElement("button");

  choice.className = "task-choice is-idle";
  choice.type = "button";
  choice.textContent = text;
  choice.dataset.pairId = String(pairId);
  choice.dataset.side = side;

  return choice;
}

function setChoiceState(choice, stateName) {
  choice.className = "task-choice";
  choice.classList.add(stateName);
}

export function loadTask(elements, content) {
  let isComplete = false;

  elements.mountTask("tpl-matching", (root) => {
    const pairs = normalizePairs(content);
    const leftColumn = root.querySelector(".matching-grid__column--left");
    const rightColumn = root.querySelector(".matching-grid__column--right");
    const selected = {
      left: null,
      right: null,
    };
    let correctPairsCount = 0;

    function updateContinueState() {
      isComplete = correctPairsCount === pairs.length;
      elements.continueBtn.disabled = !isComplete;
    }

    for (const pair of pairs) {
      leftColumn.append(createChoice(pair.left, pair.id, "left"));
    }

    for (const pair of shuffle(pairs)) {
      rightColumn.append(createChoice(pair.right, pair.id, "right"));
    }

    function clearSelection(side) {
      const selectedChoice = selected[side];

      if (!selectedChoice) {
        return;
      }

      setChoiceState(selectedChoice, "is-idle");
      selected[side] = null;
    }

    function resetWrongPair(leftChoice, rightChoice) {
      window.setTimeout(() => {
        if (leftChoice.classList.contains("is-wrong")) {
          setChoiceState(leftChoice, "is-idle");
        }

        if (rightChoice.classList.contains("is-wrong")) {
          setChoiceState(rightChoice, "is-idle");
        }
      }, 1000);
    }

    function checkSelectedPair() {
      const leftChoice = selected.left;
      const rightChoice = selected.right;

      if (!leftChoice || !rightChoice) {
        return;
      }

      const isCorrect = leftChoice.dataset.pairId === rightChoice.dataset.pairId;

      setChoiceState(leftChoice, isCorrect ? "is-correct" : "is-wrong");
      setChoiceState(rightChoice, isCorrect ? "is-correct" : "is-wrong");
      selected.left = null;
      selected.right = null;

      if (isCorrect) {
        correctPairsCount += 1;
        updateContinueState();
      } else {
        resetWrongPair(leftChoice, rightChoice);
      }
    }

    function handleChoiceClick(choice) {
      if (choice.classList.contains("is-correct")) {
        return;
      }

      const side = choice.dataset.side;

      if (choice.classList.contains("is-selected")) {
        clearSelection(side);
        return;
      }

      clearSelection(side);
      selected[side] = choice;
      setChoiceState(choice, "is-selected");
      checkSelectedPair();
    }

    root.querySelector(".matching-grid").addEventListener("click", (event) => {
      const choice = event.target.closest(".task-choice");

      if (choice) {
        handleChoiceClick(choice);
      }
    });

    updateContinueState();
  });

  return function verify() {
    return true;
  };
}
