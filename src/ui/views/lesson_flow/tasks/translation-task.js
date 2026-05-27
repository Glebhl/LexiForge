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
import {
  CORRECT,
  MISTAKE,
  evaluateTranslationAnswer,
  isPassingEvaluation,
  isTranslationAnswerCorrect,
} from "../../../../pipeline/answer-checking.js";
import { t } from "../../../../i18n/index.js";
import { notify } from "../../../notifications.js";

const WORD_BANK_MODE = "word-bank";
const TYPING_MODE = "typing";
const FLIP_PLACEHOLDER_MS = 120;

function showAnswerFeedback(evaluation, feedback) {
  const message = String(feedback || "").trim();
  if (!message || evaluation === CORRECT) return;

  if (evaluation === MISTAKE) {
    notify.warning(message, { title: t("notifications.checkAnswer") });
  } else {
    notify.info(message, { title: t("lesson.almostThere") });
  }
}

function getMinimumWordBank(sentences) {
  const wordRegex = /\p{L}+(?:[-'’]\p{L}+)*/gu;
  const maxWordCounts = {};

  for (const sentence of sentences) {
    const matches = sentence.match(wordRegex);

    const currentWordCounts = {};
    for (const word of matches) {
      currentWordCounts[word] = (currentWordCounts[word] ?? 0) + 1;
    }

    for (const word in currentWordCounts) {
      const currentCount = currentWordCounts[word];
      const maxCount = maxWordCounts[word] || 0;

      if (currentCount > maxCount) {
        maxWordCounts[word] = currentCount;
      }
    }
  }

  const result = [];
  for (const word in maxWordCounts) {
    const count = maxWordCounts[word];
    for (let i = 0; i < count; i++) {
      result.push(word);
    }
  }

  return result;
}

function buildKeyboardWords(answers, distractors) {
  const correctWords = getMinimumWordBank(answers);
  return shuffle([...correctWords, ...distractors]);
}

export function loadTask(elements, mountTask, content, meta = {}) {
  const promptText = String(content?.sentence || content?.paragraph || "");
  const correctAnswers = Array.isArray(content?.answers) ? content.answers : [];
  const distractors = Array.isArray(content?.distractors)
    ? content.distractors
    : [];
  const keyboardWords = buildKeyboardWords(correctAnswers, distractors);

  let getUserAnswer = () => "";
  let showInvalidAnswer = () => {};

  mountTask("tpl-translation", (root) => {
    const answerArea = root.querySelector(".task-answer--translation");
    const answerShell = root.querySelector(".task-answer-shell--translation");
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
      const filled =
        state.mode === TYPING_MODE
          ? getTypingText().length > 0
          : answerArea.querySelector(".task-key") !== null;
      setContinueEnabled(elements, filled);
    }

    function clearInvalidAnswer() {
      answerShell.classList.remove("task-answer--invalid");
    }

    showInvalidAnswer = () => {
      answerShell.classList.remove("task-answer--invalid");
      answerShell.offsetWidth;
      answerShell.classList.add("task-answer--invalid");
    };

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
        const overKeyboard =
          !overAnswer && isPointInside(keyboardArea, pointerX, pointerY);

        if (overAnswer) {
          const beforeNode = findInsertBeforeNode(
            answerArea,
            pointerX,
            pointerY,
            dragState.wordElement,
          );
          const needsMove =
            dragState.placeholder.parentNode !== answerArea ||
            dragState.placeholder.nextSibling !== beforeNode;

          if (needsMove) {
            runFlipAnimation(
              containers,
              () => {
                if (beforeNode) {
                  answerArea.insertBefore(dragState.placeholder, beforeNode);
                } else {
                  answerArea.append(dragState.placeholder);
                }
              },
              FLIP_PLACEHOLDER_MS,
            );
          }

          dragState.data.dropTarget = "answer";
        } else if (overKeyboard) {
          const beforeNode = findInsertBeforeNode(
            keyboardArea,
            pointerX,
            pointerY,
            dragState.wordElement,
          );
          const needsMove =
            dragState.placeholder.parentNode !== keyboardArea ||
            dragState.placeholder.nextSibling !== beforeNode;

          if (needsMove) {
            runFlipAnimation(
              containers,
              () => {
                if (beforeNode) {
                  keyboardArea.insertBefore(dragState.placeholder, beforeNode);
                } else {
                  keyboardArea.append(dragState.placeholder);
                }
              },
              FLIP_PLACEHOLDER_MS,
            );
          }

          dragState.data.dropTarget = "keyboard";
        } else {
          dragState.data.dropTarget = null;
        }
      },
      onDrop(dragState, settle) {
        const target = dragState.data.dropTarget;

        if (target === "answer") {
          settle(() => {
            dragState.placeholder.replaceWith(dragState.wordElement);
            clearInvalidAnswer();
            updateContinueState();
          });
          return true;
        }

        if (target === "keyboard") {
          settle(() => {
            dragState.placeholder.replaceWith(dragState.wordElement);
            clearInvalidAnswer();
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
        clearInvalidAnswer();
        updateContinueState();
      });
    }

    keyboardArea.addEventListener("click", handleWordClick);
    answerArea.addEventListener("click", handleWordClick);
    typingInput.addEventListener("input", () => {
      clearInvalidAnswer();
      updateContinueState();
    });

    attachModeSwitch(modeSwitchRoot, switchMode, meta.mode || WORD_BANK_MODE);
    updateContinueState();

    getUserAnswer = () =>
      state.mode === TYPING_MODE ? getTypingText() : getWordBankText();
  });

  return async function verify() {
    const userAnswer = normalizeInlineText(getUserAnswer());
    if (userAnswer.length === 0) {
      showInvalidAnswer();
      return MISTAKE;
    }

    if (isTranslationAnswerCorrect(userAnswer, correctAnswers)) {
      return CORRECT;
    }

    let evaluation = MISTAKE;
    let feedback = "";
    try {
      const result = await evaluateTranslationAnswer(
        promptText,
        userAnswer,
        meta.learnerLanguage,
      );
      evaluation = result?.evaluation || result || MISTAKE;
      feedback = result?.feedback || "";
    } catch (error) {
      console.error("Translation answer check failed", error);
      notify.warning(
        error.message || t("lesson.translation.answerCheckFailed"),
        {
          title: t("notifications.answerCheckUnavailable"),
        },
      );
    }
    console.debug(
      `isCorrect=${evaluation}, expected=${correctAnswers}, answer=${userAnswer}`,
    );

    showAnswerFeedback(evaluation, feedback);
    if (!isPassingEvaluation(evaluation)) showInvalidAnswer();
    return evaluation;
  };
}
