// Translation task: keyboard interactions, selected answer tracking,
// answer extraction, and validation highlighting.

const translationKeyTemplate = document.getElementById("key-template");

const translationState = {
  selectedWordIds: [],
  rootElement: null,
};

let translationWordIdCounter = 0;

/**
 * Initialize a translation task.
 *
 * @param {HTMLElement} rootElement
 * @param {string} sentenceText
 * @param {string[]} keyboardWords
 * @returns {Function} highlightTranslation
 */
function initTranslation(rootElement, sentenceText, keyboardWords) {
  const answerContainer = rootElement.querySelector(
    ".task-answer--translation",
  );
  const keyboardContainer = rootElement.querySelector(".task-keyboard");
  const promptElement = rootElement.querySelector(".translation-prompt");

  resetTranslationState(rootElement);

  promptElement.textContent =
    sentenceText === undefined ? "" : String(sentenceText);

  answerContainer.replaceChildren();
  keyboardContainer.replaceChildren();

  const words = Array.isArray(keyboardWords) ? keyboardWords : [];
  for (let i = 0; i < words.length; i += 1) {
    keyboardContainer.append(createTranslationKey(words[i]));
  }

  lessonTaskUtils.setContinueEnabled(false);

  function handleKeyClick(event) {
    const clickedKey = event.target.closest(".task-key");
    if (!clickedKey) {
      return;
    }

    const wordId = clickedKey.dataset.id;
    const isInsideKeyboard = keyboardContainer.contains(clickedKey);

    lessonTaskUtils.runFlipAnimation(
      [keyboardContainer, answerContainer],
      function () {
        if (isInsideKeyboard) {
          moveKeyToAnswer(clickedKey, answerContainer, wordId);
        } else {
          moveKeyToKeyboard(clickedKey, keyboardContainer, wordId);
        }

        updateTranslationContinueState();
      },
    );
  }

  keyboardContainer.addEventListener("click", handleKeyClick);
  answerContainer.addEventListener("click", handleKeyClick);

  return highlightTranslation;
}

/**
 * Reset internal state for a new translation task.
 *
 * @param {HTMLElement} rootElement
 */
function resetTranslationState(rootElement) {
  translationState.selectedWordIds = [];
  translationState.rootElement = rootElement;
}

/**
 * Create one keyboard key node for a translation word.
 *
 * @param {string} text
 * @returns {HTMLElement}
 */
function createTranslationKey(text) {
  translationWordIdCounter += 1;

  return lessonTaskUtils.createWordKeyNode(
    translationKeyTemplate,
    text,
    translationWordIdCounter,
  );
}

/**
 * Move a key from the keyboard into the answer area.
 *
 * @param {HTMLElement} keyElement
 * @param {HTMLElement} answerContainer
 * @param {string} wordId
 */
function moveKeyToAnswer(keyElement, answerContainer, wordId) {
  answerContainer.append(keyElement);
  translationState.selectedWordIds.push(wordId);
}

/**
 * Move a key from the answer area back into the keyboard.
 *
 * @param {HTMLElement} keyElement
 * @param {HTMLElement} keyboardContainer
 * @param {string} wordId
 */
function moveKeyToKeyboard(keyElement, keyboardContainer, wordId) {
  keyboardContainer.append(keyElement);
  removeSelectedWordId(wordId);
}

/**
 * Remove a word id from the selected answer order.
 *
 * @param {string} wordId
 */
function removeSelectedWordId(wordId) {
  const ids = translationState.selectedWordIds;

  for (let i = 0; i < ids.length; i += 1) {
    if (ids[i] === wordId) {
      ids.splice(i, 1);
      return;
    }
  }
}

/**
 * Continue button becomes enabled when at least one word is selected.
 */
function updateTranslationContinueState() {
  lessonTaskUtils.setContinueEnabled(
    translationState.selectedWordIds.length > 0,
  );
}

/**
 * Build the selected translation answer as a space-separated string.
 *
 * @returns {string}
 */
function getTranslationAnswerString() {
  const rootElement = translationState.rootElement;
  if (!rootElement) {
    return "";
  }

  const answerContainer = rootElement.querySelector(
    ".task-answer--translation",
  );
  if (!answerContainer) {
    return "";
  }

  const keyElements = answerContainer.querySelectorAll(".task-key");
  const textById = new Map();

  for (let i = 0; i < keyElements.length; i += 1) {
    const keyElement = keyElements[i];
    textById.set(keyElement.dataset.id, keyElement.textContent.trim());
  }

  const resultWords = [];

  for (let i = 0; i < translationState.selectedWordIds.length; i += 1) {
    const wordId = translationState.selectedWordIds[i];
    const wordText = textById.get(wordId);

    if (wordText) {
      resultWords.push(wordText);
    }
  }

  return resultWords.join(" ");
}

/**
 * Highlight the answer area depending on correctness.
 *
 * @param {boolean} isCorrect
 */
function highlightTranslation(isCorrect) {
  const rootElement = translationState.rootElement;
  if (!rootElement) {
    return;
  }

  const answerShell = rootElement.querySelector(
    ".task-answer-shell--translation",
  );
  if (!answerShell) {
    return;
  }

  answerShell.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
}
