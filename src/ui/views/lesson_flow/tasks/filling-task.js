import {
  attachModeSwitch,
  attachWordDrag,
  createWordKey,
  isPointInside,
  normalizeInlineText,
  runFlipAnimation,
  setContinueEnabled,
  shuffle,
} from "./word-bank-utils.js";

const WORD_BANK_MODE = "word-bank";
const TYPING_MODE = "typing";
const BLANK_PATTERN = /\[([^\]]+)\]/g;

function parseParagraph(paragraph) {
  const text = String(paragraph || "");
  const parts = [];
  const answers = [];
  let cursor = 0;

  for (const match of text.matchAll(BLANK_PATTERN)) {
    parts.push(text.slice(cursor, match.index));
    answers.push(match[1].trim());
    cursor = match.index + match[0].length;
  }
  parts.push(text.slice(cursor));

  return { parts, answers };
}

function createTextNode(text) {
  const element = document.createElement("span");
  element.className = "filling-text";
  element.textContent = text;
  return element;
}

function createBlankSlot() {
  const blank = document.createElement("span");
  const inputWrap = document.createElement("span");
  const input = document.createElement("input");

  blank.className = "task-blank";
  inputWrap.className = "task-blank__input-wrap";
  input.className = "task-blank__input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;

  inputWrap.append(input);
  blank.append(inputWrap);
  return blank;
}

function buildAnswerLayout(answerArea, parts) {
  for (let index = 0; index < parts.length; index += 1) {
    answerArea.append(createTextNode(parts[index]));
    if (index !== parts.length - 1) {
      answerArea.append(createBlankSlot());
    }
  }
}

export function loadTask(elements, mountTask, content) {
  const { parts, answers: correctAnswers } = parseParagraph(content?.paragraph);
  const distractors = Array.isArray(content?.distractors) ? content.distractors : [];
  const keyboardWords = shuffle([...correctAnswers, ...distractors]);

  let getUserAnswers = () => [];

  mountTask("tpl-filling", (root) => {
    const answerArea = root.querySelector(".task-answer--filling");
    const keyboardArea = root.querySelector(".task-keyboard");
    const modeSwitchRoot = root.querySelector(".task-keyboard__mode-switch");

    answerArea.replaceChildren();
    keyboardArea.replaceChildren();
    buildAnswerLayout(answerArea, parts);

    const blanks = Array.from(answerArea.querySelectorAll(".task-blank"));
    const containers = [keyboardArea, answerArea];
    const state = { mode: WORD_BANK_MODE };

    for (const word of keyboardWords) {
      keyboardArea.append(createWordKey(word));
    }

    function getBlankText(index) {
      if (state.mode === TYPING_MODE) {
        const input = blanks[index].querySelector(".task-blank__input");
        return normalizeInlineText(input.value);
      }
      const placed = blanks[index].querySelector(".task-key");
      return placed ? normalizeInlineText(placed.textContent) : "";
    }

    function updateContinueState() {
      const allFilled = blanks.every((_, index) => getBlankText(index).length > 0);
      setContinueEnabled(elements, allFilled);
    }

    function syncInputsFromWords() {
      blanks.forEach((blank, index) => {
        const input = blank.querySelector(".task-blank__input");
        const placed = blank.querySelector(".task-key");
        input.value = placed ? normalizeInlineText(placed.textContent) : "";
      });
    }

    function switchMode(nextMode) {
      const typing = nextMode === TYPING_MODE;
      state.mode = typing ? TYPING_MODE : WORD_BANK_MODE;
      root.classList.toggle("is-filling-typing", typing);

      if (typing) {
        syncInputsFromWords();
        blanks[0]?.querySelector(".task-blank__input")?.focus();
      }
      updateContinueState();
    }

    function clearDropHighlights() {
      for (const blank of blanks) {
        blank.classList.remove("is-drop-target");
      }
      keyboardArea.classList.remove("is-drop-target");
    }

    function moveWordToBlank(wordElement, targetBlank) {
      const sourceBlank = wordElement.closest(".task-blank");
      const existing = targetBlank.querySelector(".task-key");

      if (existing && existing !== wordElement) {
        if (sourceBlank && sourceBlank !== targetBlank) {
          sourceBlank.append(existing);
        } else {
          keyboardArea.append(existing);
        }
      }
      targetBlank.append(wordElement);
    }

    const drag = attachWordDrag(root, {
      isEnabled: () => state.mode === WORD_BANK_MODE,
      containers,
      onMove(dragState, pointerX, pointerY) {
        let hoveredBlank = null;
        for (const blank of blanks) {
          if (isPointInside(blank, pointerX, pointerY)) {
            hoveredBlank = blank;
            break;
          }
        }
        dragState.data.dropBlank = hoveredBlank;
        keyboardArea.classList.toggle("is-drop-target", isPointInside(keyboardArea, pointerX, pointerY));
        for (const blank of blanks) {
          blank.classList.toggle("is-drop-target", blank === hoveredBlank);
        }
      },
      onDrop(dragState, settle, pointerX, pointerY) {
        const { dropBlank } = dragState.data;
        const sourceBlank = dragState.restoreParent.closest(".task-blank");

        if (dropBlank && dropBlank !== sourceBlank) {
          settle(() => {
            clearDropHighlights();
            moveWordToBlank(dragState.wordElement, dropBlank);
            dragState.placeholder.remove();
            updateContinueState();
          });
          return true;
        }

        if (!dropBlank && sourceBlank && isPointInside(keyboardArea, pointerX, pointerY)) {
          settle(() => {
            clearDropHighlights();
            dragState.placeholder.remove();
            keyboardArea.append(dragState.wordElement);
            updateContinueState();
          });
          return true;
        }

        clearDropHighlights();
        return false;
      },
    });

    function handleWordClick(event) {
      if (state.mode !== WORD_BANK_MODE) return;
      if (drag.wasClickSuppressed()) {
        event.preventDefault();
        return;
      }

      const wordElement = event.target.closest(".task-key");
      if (!wordElement) return;

      const isInKeyboard = keyboardArea.contains(wordElement);

      runFlipAnimation(containers, () => {
        if (isInKeyboard) {
          const emptyBlank = blanks.find((blank) => !blank.querySelector(".task-key"));
          if (!emptyBlank) return;
          emptyBlank.append(wordElement);
        } else {
          keyboardArea.append(wordElement);
        }
        updateContinueState();
      });
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);

    for (const blank of blanks) {
      blank.querySelector(".task-blank__input").addEventListener("input", updateContinueState);
    }

    attachModeSwitch(modeSwitchRoot, switchMode, WORD_BANK_MODE);
    updateContinueState();

    getUserAnswers = () => blanks.map((_, index) => getBlankText(index));
  });

  return function verify() {
    const userAnswers = getUserAnswers();
    if (userAnswers.length !== correctAnswers.length) return false;

    return correctAnswers.every(
      (expected, index) => normalizeInlineText(userAnswers[index]) === normalizeInlineText(expected),
    );
  };
}
