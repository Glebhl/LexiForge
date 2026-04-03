(function registerExplanationTask(globalObject) {
  const utils = globalObject.lessonSharedUtils;

  function renderCard(card) {
    const cardElement = utils.cloneTemplateElement("tpl-explanation-card", "article");
    const titleElement = cardElement.querySelector(".lesson-card__label");
    const contentElement = cardElement.querySelector(".md-content");

    titleElement.textContent = card && card.name ? String(card.name) : "";
    contentElement.innerHTML = card && card.content ? String(card.content) : "";

    return cardElement;
  }

  function createTaskController(rootElement, payload) {
    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    const fragment = document.createDocumentFragment();

    for (const card of cards) {
      fragment.append(renderCard(card));
    }

    rootElement.replaceChildren(fragment);
    utils.setContinueEnabled(true);

    return {};
  }

  globalObject.lessonTaskRegistry.register("explanation", createTaskController);
})(window);
