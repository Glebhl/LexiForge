const DRAG_START_DISTANCE = 6;
const FLIP_DURATION_MS = 200;

let nextWordId = 0;

export function normalizeInlineText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function setContinueEnabled(elements, enabled) {
  elements.continueBtn.disabled = !enabled;
}

export function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

export function createWordKey(text) {
  const element = document.createElement("button");

  nextWordId += 1;
  element.type = "button";
  element.className = "task-key";
  element.textContent = String(text);
  element.dataset.id = String(nextWordId);

  return element;
}

export function isPointInside(element, pointerX, pointerY) {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return (
    pointerX >= rect.left &&
    pointerX <= rect.right &&
    pointerY >= rect.top &&
    pointerY <= rect.bottom
  );
}

export function findInsertBeforeNode(
  container,
  pointerX,
  pointerY,
  ignoredNode,
) {
  const wordNodes = Array.from(container.querySelectorAll(".task-key")).filter(
    (node) => node !== ignoredNode,
  );

  for (const node of wordNodes) {
    const rect = node.getBoundingClientRect();
    const onSameRow = pointerY >= rect.top && pointerY <= rect.bottom;

    if (onSameRow && pointerX <= rect.left + rect.width / 2) {
      return node;
    }

    if (pointerY < rect.top) {
      return node;
    }
  }

  return null;
}

function collectWordNodes(containers) {
  const nodes = [];

  for (const container of containers) {
    if (!container) continue;
    for (const node of container.querySelectorAll(".task-key")) {
      nodes.push(node);
    }
  }

  return nodes;
}

function animateNodesFromRects(nodes, startingRects, durationMs) {
  for (const node of nodes) {
    const firstRect = startingRects.get(node);
    if (!firstRect) continue;

    const finalRect = node.getBoundingClientRect();
    const deltaX = firstRect.left - finalRect.left;
    const deltaY = firstRect.top - finalRect.top;

    if (deltaX === 0 && deltaY === 0) continue;

    node.style.transition = "transform 0s";
    node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    requestAnimationFrame(() => {
      node.style.transition = `transform ${durationMs}ms ease`;
      node.style.transform = "translate(0, 0)";
    });

    node.addEventListener(
      "transitionend",
      () => {
        node.style.transition = "";
        node.style.transform = "";
      },
      { once: true },
    );
  }
}

export function runFlipAnimation(
  containers,
  mutate,
  durationMs = FLIP_DURATION_MS,
) {
  const nodesBefore = collectWordNodes(containers);
  const startingRects = new Map();

  for (const node of nodesBefore) {
    startingRects.set(node, node.getBoundingClientRect());
  }

  mutate();

  animateNodesFromRects(
    collectWordNodes(containers),
    startingRects,
    durationMs,
  );
}

function createPlaceholder(wordElement, rect, options = {}) {
  const placeholder = document.createElement("div");
  const placeholderText =
    typeof options.placeholderText === "function"
      ? options.placeholderText(wordElement)
      : wordElement.textContent || "";

  placeholder.className = [
    "task-key-placeholder",
    options.placeholderClassName || "",
  ]
    .filter(Boolean)
    .join(" ");
  placeholder.textContent = placeholderText;
  placeholder.style.width = `${rect.width}px`;
  placeholder.style.height = `${rect.height}px`;

  return placeholder;
}

function beginFloatingDrag(wordElement, pointerX, pointerY, options = {}) {
  const rect = wordElement.getBoundingClientRect();
  const placeholder = createPlaceholder(wordElement, rect, options);
  const originalStyle = wordElement.getAttribute("style");

  wordElement.parentNode.insertBefore(placeholder, wordElement);
  document.body.append(wordElement);
  wordElement.classList.add("task-key--dragging");
  Object.assign(wordElement.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: "9999",
    pointerEvents: "none",
  });
  document.body.classList.add("is-word-dragging");

  return {
    offsetX: pointerX - rect.left,
    offsetY: pointerY - rect.top,
    originalStyle,
    placeholder,
    wordElement,
  };
}

function moveFloatingDrag(dragState, pointerX, pointerY) {
  dragState.wordElement.style.left = `${pointerX - dragState.offsetX}px`;
  dragState.wordElement.style.top = `${pointerY - dragState.offsetY}px`;
}

function endFloatingDrag(dragState) {
  dragState.wordElement.classList.remove("task-key--dragging");

  if (dragState.originalStyle === null) {
    dragState.wordElement.removeAttribute("style");
  } else {
    dragState.wordElement.setAttribute("style", dragState.originalStyle);
  }

  document.body.classList.remove("is-word-dragging");
}

function settleFloatingDrag(
  dragState,
  containers,
  mutate,
  durationMs = FLIP_DURATION_MS,
) {
  const otherNodes = collectWordNodes(containers).filter(
    (node) => node !== dragState.wordElement,
  );
  const startingRects = new Map();

  for (const node of otherNodes) {
    startingRects.set(node, node.getBoundingClientRect());
  }

  startingRects.set(
    dragState.wordElement,
    dragState.wordElement.getBoundingClientRect(),
  );
  endFloatingDrag(dragState);
  mutate();
  animateNodesFromRects(
    collectWordNodes(containers),
    startingRects,
    durationMs,
  );
}

export function attachWordDrag(rootElement, options) {
  const { isEnabled, onMove, onDrop, containers } = options;
  let activeDrag = null;
  let suppressClick = false;

  function cleanup() {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp, true);
    window.removeEventListener("pointercancel", handleCancel, true);
  }

  function restore(dragState) {
    settleFloatingDrag(dragState, containers, () => {
      const { restoreParent, restoreBeforeNode, wordElement, placeholder } =
        dragState;

      if (restoreBeforeNode && restoreBeforeNode.parentNode === restoreParent) {
        restoreParent.insertBefore(wordElement, restoreBeforeNode);
      } else {
        restoreParent.append(wordElement);
      }
      placeholder.remove();
    });
  }

  function finish(event, forceRestore) {
    if (!activeDrag) return;

    const dragState = activeDrag;
    cleanup();

    if (!dragState.didStart) {
      activeDrag = null;
      return;
    }

    let pointerX = dragState.startX;
    let pointerY = dragState.startY;

    if (event) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      moveFloatingDrag(dragState, pointerX, pointerY);
      onMove(dragState, pointerX, pointerY);
    }

    const dropped = forceRestore
      ? false
      : onDrop(
          dragState,
          (mutate) => settleFloatingDrag(dragState, containers, mutate),
          pointerX,
          pointerY,
        );

    if (!dropped) {
      restore(dragState);
    }

    activeDrag = null;
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
  }

  function handleMove(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

    if (!activeDrag.didStart) {
      const deltaX = event.clientX - activeDrag.startX;
      const deltaY = event.clientY - activeDrag.startY;
      if (Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE) return;

      activeDrag.didStart = true;
      Object.assign(
        activeDrag,
        beginFloatingDrag(
          activeDrag.wordElement,
          event.clientX,
          event.clientY,
          options,
        ),
      );
    }

    event.preventDefault();
    moveFloatingDrag(activeDrag, event.clientX, event.clientY);
    onMove(activeDrag, event.clientX, event.clientY);
  }

  function handleUp(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    finish(event, false);
  }

  function handleCancel(event) {
    if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
    finish(event, true);
  }

  function handleDown(event) {
    if (!isEnabled() || event.button !== 0) return;

    const wordElement = event.target.closest(".task-key");
    if (!wordElement || !rootElement.contains(wordElement)) return;

    event.preventDefault();

    activeDrag = {
      didStart: false,
      pointerId: event.pointerId,
      restoreBeforeNode: wordElement.nextSibling,
      restoreParent: wordElement.parentNode,
      startX: event.clientX,
      startY: event.clientY,
      wordElement,
      data: {},
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, true);
    window.addEventListener("pointercancel", handleCancel, true);
  }

  rootElement.addEventListener("pointerdown", handleDown);

  return {
    wasClickSuppressed() {
      return suppressClick;
    },
  };
}

export function attachModeSwitch(rootElement, onChange, initialMode) {
  const buttons = Array.from(
    rootElement.querySelectorAll(".task-keyboard__mode-button[data-mode]"),
  );

  if (buttons.length === 0) return;

  function applyMode(mode) {
    for (const button of buttons) {
      button.classList.toggle("is-active", button.dataset.mode === mode);
    }
    onChange(mode);
  }

  for (const button of buttons) {
    button.addEventListener("click", () => applyMode(button.dataset.mode));
  }

  const startButton =
    buttons.find((b) => b.dataset.mode === initialMode) || buttons[0];
  applyMode(startButton.dataset.mode);
}
