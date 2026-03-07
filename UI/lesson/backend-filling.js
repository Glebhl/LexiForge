// Fill-in-the-blanks task interactions and answer extraction.

// Template used to create a keyboard key.
const fillingKeyTemplate = document.getElementById("key-template");

// Shared state for the current fill-in-the-blanks task.
const fillingState = {
  filledWordIds: [],
  blankNodes: [],
  root: null,
};

// Incremental unique ID for word keys.
let fillingWordIdSeq = 0;

// Initialize the fill-in-the-blanks task:
// - render sentence fragments and blanks
// - render keyboard keys
// - attach click handlers
function initFillBlanks(el, fragmentsArray, keyboardArray) {
  const answer = el.querySelector(".task-answer--filling");
  const keyboard = el.querySelector(".task-keyboard");

  const fragments = Array.isArray(fragmentsArray) ? fragmentsArray : [];
  const words = Array.isArray(keyboardArray) ? keyboardArray : [];

  // Save root element for later access in helper functions.
  fillingState.root = el;

  // Clear previous content.
  answer.replaceChildren();
  keyboard.replaceChildren();

  // Build the answer area:
  // fragment -> blank -> fragment -> blank -> ...
  for (let i = 0; i !== fragments.length; i += 1) {
    answer.append(createFillingTextNode(fragments[i]));

    if (i !== fragments.length - 1) {
      answer.append(createBlankNode());
    }
  }

  // Cache blank nodes and reset filled values.
  fillingState.blankNodes = [...answer.querySelectorAll(".task-blank")];
  fillingState.filledWordIds = Array(fillingState.blankNodes.length).fill(null);

  // Render all keyboard words.
  for (let i = 0; i !== words.length; i += 1) {
    keyboard.append(createFillingKey(words[i]));
  }

  // Update continue button state after initial render.
  updateFillingContinueState();

  // Handle both:
  // - moving a word from keyboard to the first empty blank
  // - moving a word back from a blank to the keyboard
  function onKeyClick(event) {
    const button = event.target.closest(".task-key");

    if (!button) {
      return;
    }

    const id = button.dataset.id;
    const inKeyboard = keyboard.contains(button);

    lessonTaskUtils.runFlipAnimation([keyboard, answer], function () {
      if (inKeyboard) {
        const blankIndex = firstEmptyBlankIndex();

        if (blankIndex === -1) {
          return;
        }

        fillingState.blankNodes[blankIndex].append(button);
        fillingState.filledWordIds[blankIndex] = id;
      } else {
        const blankIndex = findFilledBlankIndex(id);

        if (blankIndex !== -1) {
          fillingState.filledWordIds[blankIndex] = null;
        }

        keyboard.append(button);
      }

      updateFillingContinueState();
    });
  }

  // Listen for clicks in both areas.
  keyboard.addEventListener("click", onKeyClick);
  answer.addEventListener("click", onKeyClick);
}

// Create a plain text fragment between blank slots.
function createFillingTextNode(text) {
  const node = document.createElement("span");

  node.className = "filling-text";
  node.textContent = text === undefined ? "" : String(text);

  return node;
}

// Create an empty blank slot that can hold one selected word key.
function createBlankNode() {
  const node = document.createElement("span");

  node.className = "task-blank";

  return node;
}

// Create a selectable keyboard key and assign it a unique ID.
function createFillingKey(text) {
  fillingWordIdSeq += 1;

  return lessonTaskUtils.createWordKeyNode(
    fillingKeyTemplate,
    text,
    fillingWordIdSeq,
  );
}

// Find the first blank that does not contain a selected word yet.
function firstEmptyBlankIndex() {
  for (let i = 0; i !== fillingState.filledWordIds.length; i += 1) {
    if (fillingState.filledWordIds[i] === null) {
      return i;
    }
  }

  return -1;
}

// Find the blank index that currently contains the given word ID.
function findFilledBlankIndex(id) {
  for (let i = 0; i !== fillingState.filledWordIds.length; i += 1) {
    if (fillingState.filledWordIds[i] === id) {
      return i;
    }
  }

  return -1;
}

// Enable the continue button only when all blanks are filled.
function updateFillingContinueState() {
  if (fillingState.blankNodes.length === 0) {
    lessonTaskUtils.setContinueEnabled(true);
    return;
  }

  for (let i = 0; i !== fillingState.filledWordIds.length; i += 1) {
    if (fillingState.filledWordIds[i] === null) {
      lessonTaskUtils.setContinueEnabled(false);
      return;
    }
  }

  lessonTaskUtils.setContinueEnabled(true);
}

// Extract selected answers in their current order and return them as JSON.
function getFillingAnswerString() {
  const root = fillingState.root;

  if (!root) {
    return "[]";
  }

  const container = root.querySelector(".task-answer--filling");

  if (!container) {
    return "[]";
  }

  // Build a map: key ID -> displayed word text.
  const keys = container.querySelectorAll(".task-key");
  const keyMap = new Map();

  for (let i = 0; i !== keys.length; i += 1) {
    keyMap.set(keys[i].dataset.id, keys[i].textContent.trim());
  }

  // Collect answers in blank order.
  const result = [];

  for (let i = 0; i !== fillingState.filledWordIds.length; i += 1) {
    const id = fillingState.filledWordIds[i];

    if (!id) {
      continue;
    }

    const value = keyMap.get(id);

    if (value) {
      result.push(value);
    }
  }

  return JSON.stringify(result);
}

// Highlight the answer panel when the answer is incorrect.
function highlightFilling(isCorrect) {
  const root = fillingState.root;

  if (!root) {
    return;
  }

  const panel = root.querySelector(".task-answer-shell--filling");

  if (!panel) {
    return;
  }

  panel.classList.toggle("task-answer--invalid", !Boolean(isCorrect));
}