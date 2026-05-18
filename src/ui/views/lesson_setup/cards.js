const CARD_SELECTOR = ".lesson-card";
const CARD_SHIFT_ANIMATION_MS = 220;

let cardEntries = [];
let nextCardNumber = 0;
let boundCardList = null;

let elements = {};

export function bindCards(root = document) {
  if (boundCardList) {
    boundCardList.removeEventListener("click", handleCardActionClick);
  }

  elements = {
    template: root.getElementById("card-template"),
    cardList: root.getElementById("cards"),
    emptyText: root.getElementById("cards-empty-text"),
    deckAmount: root.getElementById("deck-amount"),
    btnStart: root.getElementById("btn-start"),
  };

  ensureCardsBound();
  elements.cardList.addEventListener("click", handleCardActionClick);
  boundCardList = elements.cardList;
  refreshDeckState();
}

export function unbindCards() {
  if (boundCardList) {
    boundCardList.removeEventListener("click", handleCardActionClick);
  }

  boundCardList = null;
  elements = {};
}

export function addCard(card) {
  ensureCardsBound();
  console.debug("Added card:", card);
  const cardEntry = createCardEntry(card);

  cardEntries.push(cardEntry);
  const cardElement = createCardElement(cardEntry);
  elements.cardList.appendChild(cardElement);
  playEnterAnimation(cardElement);
  refreshDeckState();

  return cardEntry.card;
}

export function removeCard(cardId) {
  ensureCardsBound();
  const id = String(cardId || "");
  const cardEntry = findCardEntry(id);
  const cardElement = findCardElement(id);

  if (!cardElement) {
    removeCardEntry(id);
    refreshDeckState();
    return cardEntry?.card || null;
  }

  const previousPositions = capturePositions(elements.cardList, CARD_SELECTOR);

  removeCardElement(cardElement, function () {
    removeCardEntry(id);
    refreshDeckState();
    runFlipAnimation(
      elements.cardList,
      CARD_SELECTOR,
      previousPositions,
      CARD_SHIFT_ANIMATION_MS,
    );
  });

  return cardEntry?.card || null;
}

export function getAllCards() {
  return cardEntries.map((entry) => entry.card);
}

export function getCardsAmount() {
  return cardEntries.length;
}

export function clearAllCards() {
  ensureCardsBound();
  cardEntries = [];
  nextCardNumber = 0;

  // Keep the placeholder node in the grid, only cards belong to this module.
  for (const cardElement of elements.cardList.querySelectorAll(CARD_SELECTOR)) {
    cardElement.remove();
  }

  refreshDeckState();
}

function ensureCardsBound() {
  if (
    !elements.template ||
    !elements.cardList ||
    !elements.emptyText ||
    !elements.deckAmount ||
    !elements.btnStart
  ) {
    throw new Error("Lesson setup cards view is not mounted");
  }
}

function handleCardActionClick(event) {
  const actionButton = event.target.closest(".action-btn");

  if (actionButton?.classList.contains("action-btn--remove")) {
    const cardElement = actionButton.closest(CARD_SELECTOR);
    removeCard(cardElement ? cardElement.dataset.cardId : "");
  }
}

function createCardEntry(card) {
  return {
    id: createCardId(),
    card: card,
  };
}

function createCardId() {
  nextCardNumber += 1;
  return "card-" + nextCardNumber;
}

function findCardEntry(cardId) {
  return cardEntries.find((entry) => entry.id === String(cardId || "")) || null;
}

function removeCardEntry(cardId) {
  const index = cardEntries.findIndex(
    (entry) => entry.id === String(cardId || ""),
  );

  if (index !== -1) {
    cardEntries.splice(index, 1);
  }
}

function createCardElement(cardEntry) {
  const fragment = elements.template.content.cloneNode(true);
  const cardElement = fragment.querySelector(CARD_SELECTOR);

  cardElement.dataset.cardId = cardEntry.id;
  fillCardElement(cardElement, cardEntry.card);

  return cardElement;
}

function fillCardElement(cardElement, card) {
  setText(cardElement, ".lesson-card__word", card.lexeme);
  setText(cardElement, ".meta-pill__value--unit", card.lexical_unit);
  setText(cardElement, ".meta-pill__value--part", card.part_of_speech);
  setText(cardElement, ".meta-pill__value--level", card.level);
  setText(cardElement, ".lesson-card__transcription", card.transcription);
  setText(cardElement, ".lesson-card__translation", card.translation);
  setText(cardElement, ".lesson-card__definition", card.definition);
  setText(cardElement, ".lesson-card__example", `"${card.example}"`);
}

function setText(root, selector, value) {
  root.querySelector(selector).textContent = value || "";
}

function playEnterAnimation(cardElement) {
  cardElement.animate(
    [
      { opacity: 0, transform: "scale(0.985)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    {
      duration: 150,
      easing: "ease",
      fill: "both",
    },
  );
}

function removeCardElement(cardElement, callback) {
  const animation = cardElement.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.985)" },
    ],
    {
      duration: 150,
      easing: "ease",
      fill: "both",
    },
  );

  animation.finished.finally(() => {
    cardElement.remove();
    callback();
  });
}

function findCardElement(cardId) {
  for (const cardElement of elements.cardList.querySelectorAll(CARD_SELECTOR)) {
    if (cardElement.dataset.cardId === String(cardId || "")) {
      return cardElement;
    }
  }

  return null;
}

function refreshDeckState() {
  const hasCards = cardEntries.length > 0;

  elements.deckAmount.textContent = formatDeckAmount(cardEntries.length);
  elements.emptyText.classList.toggle(
    "card-grid__empty-text--hidden",
    hasCards,
  );

  elements.btnStart.disabled = !hasCards;
}

function formatDeckAmount(amount) {
  return "Deck: " + amount + " card" + (amount === 1 ? "" : "s");
}

function capturePositions(container, selector) {
  const positions = new Map();

  for (const element of container.querySelectorAll(selector)) {
    positions.set(element, element.getBoundingClientRect());
  }

  return positions;
}

function clearFlipState(node) {
  if (node._flipAnimation) {
    node._flipAnimation.cancel();
    node._flipAnimation = null;
  }

  if (typeof node._cleanupFlipTransition === "function") {
    node._cleanupFlipTransition();
  }

  node.style.transition = "";
  node.style.transform = "";
}

function runFlipAnimation(container, selector, previousPositions, durationMs) {
  const trackedNodes = Array.from(container.querySelectorAll(selector));
  const startingRects = new Map(previousPositions.entries());

  for (const node of trackedNodes) {
    clearFlipState(node);
  }

  // FLIP: animate each remaining card from its old position into its new one.
  for (const node of trackedNodes) {
    const firstRect = startingRects.get(node);

    if (!firstRect) {
      continue;
    }

    const finalRect = node.getBoundingClientRect();
    const deltaX = firstRect.left - finalRect.left;
    const deltaY = firstRect.top - finalRect.top;

    if (deltaX === 0 && deltaY === 0) {
      continue;
    }

    if (typeof node.animate === "function") {
      node._flipAnimation = node.animate(
        [
          { transform: "translate(" + deltaX + "px, " + deltaY + "px)" },
          { transform: "translate(0, 0)" },
        ],
        {
          duration: durationMs,
          easing: "ease",
        },
      );

      node._flipAnimation.addEventListener("finish", function () {
        node._flipAnimation = null;
      });

      node._flipAnimation.addEventListener("cancel", function () {
        node._flipAnimation = null;
      });

      continue;
    }

    node.style.transition = "none";
    node.style.transform = "translate(" + deltaX + "px, " + deltaY + "px)";
    node.getBoundingClientRect();
    node.style.transition = "transform " + durationMs + "ms ease";
    node.style.transform = "translate(0, 0)";

    function handleFlipEnd(event) {
      if (event.target !== node || event.propertyName !== "transform") {
        return;
      }

      cleanupFlipTransition();
    }

    function cleanupFlipTransition() {
      node.style.transition = "";
      node.style.transform = "";
      node.removeEventListener("transitionend", handleFlipEnd);
      node._cleanupFlipTransition = null;
    }

    node._cleanupFlipTransition = cleanupFlipTransition;
    node.addEventListener("transitionend", handleFlipEnd);
  }
}
