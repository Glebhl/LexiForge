import {
  attachModeSwitch,
  attachWordDrag,
  createWordKey,
  findInsertBeforeNode,
  isPointInside,
  normalizeInlineText,
  runFlipAnimation,
  setContinueEnabled,
  shuffle,
} from "./word-bank-utils.js";

const WORD_BANK_MODE = "word-bank";
const TYPING_MODE = "typing";
const FLIP_PLACEHOLDER_MS = 120;

function splitWords(text) {
  return normalizeInlineText(text)
    .split(" ")
    .filter((word) => word.length > 0);
}

function buildKeyboardWords(answers, distractors) {
  const correctWords = splitWords(answers[0] || "");
  return shuffle([...correctWords, ...distractors]);
}

export function loadTask(elements, mountTask, content) {
  const promptText = String(content?.sentence || content?.paragraph || "");
  const correctAnswers = Array.isArray(content?.answers) ? content.answers : [];
  const distractors = Array.isArray(content?.distractors) ? content.distractors : [];
  const keyboardWords = buildKeyboardWords(correctAnswers, distractors);

  let getUserAnswer = () => "";

  mountTask("tpl-translation", (root) => {
    const answerArea = root.querySelector(".task-answer--translation");
    const keyboardArea = root.querySelector(".task-keyboard");
    const typingInput = root.querySelector(".task-answer__typing-input");
    const modeSwitchRoot = root.querySelector(".task-keyboard__mode-switch");
    const containers = [keyboardArea, answerArea];
    const state = { mode: WORD_BANK_MODE };

    root.querySelector(".translation-prompt").textContent = promptText;
    answerArea.replaceChildren();
    keyboardArea.replaceChildren();
    typingInput.value = "";

    for (const word of keyboardWords) {
      keyboardArea.append(createWordKey(word));
    }

    function getWordBankText() {
      return normalizeInlineText(
        Array.from(answerArea.querySelectorAll(".task-key"))
          .map((node) => node.textContent)
          .join(" "),
      );
    }

    function getTypingText() {
      return normalizeInlineText(typingInput.value);
    }

    function updateContinueState() {
      const filled = state.mode === TYPING_MODE
        ? getTypingText().length > 0
        : answerArea.querySelector(".task-key") !== null;
      setContinueEnabled(elements, filled);
    }

    function switchMode(nextMode) {
      const typing = nextMode === TYPING_MODE;
      state.mode = typing ? TYPING_MODE : WORD_BANK_MODE;
      root.classList.toggle("is-translation-typing", typing);

      if (typing) {
        if (getTypingText().length === 0) {
          typingInput.value = getWordBankText();
        }
        typingInput.focus();
      }
      updateContinueState();
    }

    const drag = attachWordDrag(root, {
      isEnabled: () => state.mode === WORD_BANK_MODE,
      containers,
      onMove(dragState, pointerX, pointerY) {
        const overAnswer = isPointInside(answerArea, pointerX, pointerY);
        const overKeyboard = !overAnswer && isPointInside(keyboardArea, pointerX, pointerY);

        if (overAnswer) {
          const beforeNode = findInsertBeforeNode(answerArea, pointerX, pointerY, dragState.wordElement);
          const needsMove = dragState.placeholder.parentNode !== answerArea
            || dragState.placeholder.nextSibling !== beforeNode;

          if (needsMove) {
            runFlipAnimation([answerArea], () => {
              if (beforeNode) {
                answerArea.insertBefore(dragState.placeholder, beforeNode);
              } else {
                answerArea.append(dragState.placeholder);
              }
            }, FLIP_PLACEHOLDER_MS);
          }

          dragState.data.dropTarget = "answer";
        } else {
          dragState.data.dropTarget = overKeyboard ? "keyboard" : null;
        }
      },
      onDrop(dragState, settle) {
        const target = dragState.data.dropTarget;

        if (target === "answer") {
          settle(() => {
            dragState.placeholder.replaceWith(dragState.wordElement);
            updateContinueState();
          });
          return true;
        }

        if (target === "keyboard" && dragState.restoreParent !== keyboardArea) {
          settle(() => {
            dragState.placeholder.remove();
            keyboardArea.append(dragState.wordElement);
            updateContinueState();
          });
          return true;
        }

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
          answerArea.append(wordElement);
        } else {
          keyboardArea.append(wordElement);
        }
        updateContinueState();
      });
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);
    typingInput.addEventListener("input", updateContinueState);

    attachModeSwitch(modeSwitchRoot, switchMode, WORD_BANK_MODE);
    updateContinueState();

    getUserAnswer = () => (state.mode === TYPING_MODE ? getTypingText() : getWordBankText());
  });

  return function verify() {
    const userAnswer = normalizeInlineText(getUserAnswer());
    if (userAnswer.length === 0) return false;

    return correctAnswers.some(
      (expected) => normalizeInlineText(expected) === userAnswer,
    );
  };
}
