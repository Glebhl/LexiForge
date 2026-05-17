function getText(value) {
  return value === undefined || value === null ? "" : String(value);
}

function getCorrectAnswer(options, answer) {
  if (Number.isInteger(answer) && answer >= 0 && answer < options.length) {
    return getText(options[answer]);
  }

  const answerIndex = Number(answer);
  if (
    Number.isInteger(answerIndex)
    && answerIndex >= 0
    && answerIndex < options.length
  ) {
    return getText(options[answerIndex]);
  }

  return getText(answer);
}

function createOption(optionText, correctAnswer, answerField, continueBtn) {
  const option = document.createElement("button");

  option.className = "item unselected";
  option.type = "button";
  option.textContent = optionText;

  option.addEventListener("click", () => {
    if (answerField.dataset.locked === "true") {
      return;
    }

    const isCorrect = optionText === correctAnswer;

    option.className = `item ${isCorrect ? "correct" : "wrong"}`;
    continueBtn.disabled = !isCorrect;

    if (isCorrect) {
      answerField.dataset.locked = "true";
    }
  });

  return option;
}

export function loadTask(elements, mountTask, content) {
  mountTask("tpl-question", (root) => {
    const options = Array.isArray(content?.options)
      ? content.options.map(getText)
      : [];
    const correctAnswer = getCorrectAnswer(options, content?.answer);
    const answerField = root.querySelector(".answer-field");
    const label = answerField.querySelector(".lesson-card__label");

    root.querySelector(".question-content").textContent = content?.question || "";
    root.querySelector(".question-paragraph").textContent =
      content?.paragraph || content?.passage || "";

    answerField.dataset.locked = "false";
    answerField.replaceChildren();
    if (label) {
      answerField.append(label);
    }
    elements.continueBtn.disabled = true;

    for (const optionText of options) {
      answerField.append(
        createOption(optionText, correctAnswer, answerField, elements.continueBtn),
      );
    }
  });

  return function verify() {
    return true;
  };
}
