// Initialize a question task: render question text, paragraph and answer options.
function initQuestion(el, question, pargraph, options, answer) {
  el.querySelector(".question-content").textContent = question;
  el.querySelector(".question-paragraph").textContent = pargraph;

  const answerField = el.querySelector(".answer-field");
  const label = answerField.querySelector(".lesson-card__label");

  // Reset interaction state and normalize the correct answer value.
  answerField.dataset.locked = "false";
  const normalizedAnswer =
    Number.isInteger(answer) && answer >= 0 && answer < options.length
      ? String(options[answer])
      : answer === undefined
        ? ""
        : String(answer);

  // Clear previous answers and restore label if present.
  answerField.replaceChildren();
  if (label) {
    answerField.append(label);
  }

  // Disable continue button until the correct answer is selected.
  lessonTaskUtils.setContinueEnabled(false);

  // Render answer options.
  options.forEach((optionText) => {
    answerField.append(createAnswerNode(optionText, normalizedAnswer));
  });
}


// Create an interactive answer option with click and keyboard support.
function createAnswerNode(text, correctAnswer) {
  const node = document.createElement("div");
  const normalizedText = text === undefined ? "" : String(text);

  node.className = "item unselected";
  node.textContent = normalizedText;
  node.dataset.answer = normalizedText;

  // Accessibility: make element focusable and behave like a button.
  node.tabIndex = 0;
  node.setAttribute("role", "button");

  // Handle answer selection and validation.
  const selectAnswer = () => {
    const answerField = node.parentElement;
    if (!answerField || answerField.dataset.locked === "true") {
      return;
    }

    const items = answerField.querySelectorAll(".item");
    const isCorrect = normalizedText === correctAnswer;

    // Reset visual state of all answers.
    items.forEach((item) => {
      item.className = "item unselected";
    });

    // Mark selected answer.
    node.className = "item";
    node.classList.add(isCorrect ? "correct" : "wrong");

    lessonTaskUtils.setContinueEnabled(isCorrect);

    // Lock answers after the correct one is chosen.
    if (isCorrect) {
      answerField.dataset.locked = "true";

      items.forEach((item) => {
        item.tabIndex = -1;
        item.setAttribute("aria-disabled", "true");
        item.classList.remove("unselected");
        item.classList.add("is-idle");
      });
    }
  };

  // Mouse and keyboard interaction.
  node.addEventListener("click", selectAnswer);
  node.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    selectAnswer();
  });

  return node;
}