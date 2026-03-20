(function registerQuestionTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;

  function normalizeCorrectAnswer(options, answer) {
    if (Number.isInteger(answer) && answer >= 0 && answer < options.length) {
      return String(options[answer]);
    }

    return answer === undefined ? "" : String(answer);
  }

  function createOption(text, correctAnswer) {
    const optionElement = document.createElement("div");
    const optionText = text === undefined ? "" : String(text);

    optionElement.className = "item unselected";
    optionElement.dataset.answer = optionText;
    optionElement.tabIndex = 0;
    optionElement.textContent = optionText;
    optionElement.setAttribute("role", "button");

    function selectOption() {
      const answerField = optionElement.parentElement;

      if (!answerField || answerField.dataset.locked === "true") {
        return;
      }

      const optionElements = answerField.querySelectorAll(".item");
      const isCorrect = optionText === correctAnswer;

      for (const item of optionElements) {
        item.className = "item unselected";
      }

      optionElement.className = "item";
      optionElement.classList.add(isCorrect ? "correct" : "wrong");
      utils.setContinueEnabled(isCorrect);

      if (!isCorrect) {
        return;
      }

      answerField.dataset.locked = "true";

      for (const item of optionElements) {
        item.tabIndex = -1;
        item.setAttribute("aria-disabled", "true");
        item.classList.remove("unselected");
        item.classList.add("is-idle");
      }
    }

    optionElement.addEventListener("click", selectOption);
    optionElement.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      selectOption();
    });

    return optionElement;
  }

  function mount(rootElement, payload) {
    const questionText = payload && payload.question ? String(payload.question) : "";
    const paragraphText = payload && payload.paragraph ? String(payload.paragraph) : "";
    const options = Array.isArray(payload && payload.options) ? payload.options : [];
    const correctAnswer = normalizeCorrectAnswer(options, payload ? payload.answer : undefined);
    const answerField = rootElement.querySelector(".answer-field");
    const labelElement = answerField.querySelector(".lesson-card__label");

    rootElement.querySelector(".question-content").textContent = questionText;
    rootElement.querySelector(".question-paragraph").textContent = paragraphText;

    answerField.dataset.locked = "false";
    answerField.replaceChildren();

    if (labelElement) {
      answerField.append(labelElement);
    }

    for (const optionText of options) {
      answerField.append(createOption(optionText, correctAnswer));
    }

    utils.setContinueEnabled(false);
  }

  globalObject.lessonTaskRegistry.register("question", {
    mount: mount,
  });
  globalObject.initQuestion = function initQuestion(
    rootElement,
    question,
    paragraph,
    options,
    answer,
  ) {
    mount(rootElement, {
      answer: answer,
      options: options,
      paragraph: paragraph,
      question: question,
    });
  };
})(window);
