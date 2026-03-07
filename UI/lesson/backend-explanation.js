// Template used to render explanation cards.
const cardTemplate = document.getElementById("article-template");

/**
 * Render explanation cards inside the task container.
 * Continue button is enabled immediately because this task
 * only requires reading the explanation.
 */
function initExplanation(container, cardsContent) {
  lessonTaskUtils.setContinueEnabled(true);

  // Ensure we always work with an array.
  const cards = Array.isArray(cardsContent) ? cardsContent : [];

  // Build all card nodes in a fragment to avoid multiple DOM reflows.
  const fragment = document.createDocumentFragment();

  for (const card of cards) {
    const name = card?.name ?? "";
    const content = card?.content ?? "";

    const cardNode = createCardNode(name, content);
    fragment.append(cardNode);
  }

  // Replace existing content with rendered cards.
  container.replaceChildren(fragment);
}

/**
 * Create a single explanation card from backend data.
 */
function createCardNode(name, content) {
  // Clone template content.
  const templateContent = cardTemplate.content.cloneNode(true);

  const labelElement = templateContent.querySelector(".lesson-card__label");
  const contentElement = templateContent.querySelector(".md-content");

  // Fill template fields.
  labelElement.textContent = name;
  contentElement.innerHTML = content;

  return templateContent;
}
