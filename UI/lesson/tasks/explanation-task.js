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

  function mount(rootElement, payload) {
    const cards = Array.isArray(payload && payload.cards) ? payload.cards : [];
    const fragment = document.createDocumentFragment();

    for (const card of cards) {
      fragment.append(renderCard(card));
    }

    rootElement.replaceChildren(fragment);
    utils.setContinueEnabled(true);
  }

  globalObject.lessonTaskRegistry.register("explanation", {
    mount: mount,
  });
  globalObject.initExplanation = function initExplanation(container, cardsContent) {
    mount(container, { cards: cardsContent });
  };
})(window);
