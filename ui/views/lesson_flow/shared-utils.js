(function registerLessonSharedUtils(globalObject) {
  function cloneTemplateElement(templateId, selector) {
    const template = document.getElementById(templateId);

    if (!template) {
      throw new Error("Template_not_found:" + templateId);
    }

    const fragment = template.content.cloneNode(true);
    const element = selector ? fragment.querySelector(selector) : fragment.firstElementChild;

    if (!element) {
      throw new Error("Template_has_no_matching_element:" + templateId);
    }

    return element;
  }

  function setContinueEnabled(enabled) {
    const continueButton = document.getElementById("continue");

    if (continueButton) {
      continueButton.disabled = !Boolean(enabled);
    }
  }

  function collectWordKeyNodes(containers) {
    const nodes = [];

    for (const container of containers) {
      if (!container) {
        continue;
      }

      const foundNodes = container.querySelectorAll(".task-key");
      for (const node of foundNodes) {
        nodes.push(node);
      }
    }

    return nodes;
  }

  function runFlipAnimation(containers, mutateDom, durationMs) {
    const animationDuration = Number.isFinite(durationMs) ? durationMs : 200;
    const nodesBeforeMove = collectWordKeyNodes(containers);
    const startingRects = new Map();

    for (const node of nodesBeforeMove) {
      startingRects.set(node, node.getBoundingClientRect());
    }

    mutateDom();

    const nodesAfterMove = collectWordKeyNodes(containers);

    for (const node of nodesAfterMove) {
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

      node.style.transition = "transform 0s";
      node.style.transform = "translate(" + deltaX + "px, " + deltaY + "px)";

      requestAnimationFrame(function () {
        node.style.transition = "transform " + animationDuration + "ms ease";
        node.style.transform = "translate(0, 0)";
      });

      node.addEventListener(
        "transitionend",
        function () {
          node.style.transition = "";
          node.style.transform = "";
        },
        { once: true },
      );
    }
  }

  function animateWordNodes(nodes, startingRects, durationMs) {
    const animationDuration = Number.isFinite(durationMs) ? durationMs : 200;

    for (const node of nodes) {
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

      node.style.transition = "transform 0s";
      node.style.transform = "translate(" + deltaX + "px, " + deltaY + "px)";

      requestAnimationFrame(function () {
        node.style.transition = "transform " + animationDuration + "ms ease";
        node.style.transform = "translate(0, 0)";
      });

      node.addEventListener(
        "transitionend",
        function () {
          node.style.transition = "";
          node.style.transform = "";
        },
        { once: true },
      );
    }
  }

  function createWordKey(text, id) {
    const keyElement = cloneTemplateElement("tpl-word-key", ".task-key");

    keyElement.textContent = String(text);
    keyElement.dataset.id = String(id);

    return keyElement;
  }

  function shuffleInPlace(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const currentValue = items[index];

      items[index] = items[randomIndex];
      items[randomIndex] = currentValue;
    }

    return items;
  }

  function normalizeInlineText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createWordPlaceholder(wordElement, rect) {
    const placeholder = document.createElement("div");

    placeholder.className = "task-key-placeholder";
    placeholder.textContent = String(wordElement.textContent || "");
    placeholder.style.width = rect.width + "px";
    placeholder.style.height = rect.height + "px";

    return placeholder;
  }

  function beginFloatingWordDrag(wordElement, pointerX, pointerY) {
    const rect = wordElement.getBoundingClientRect();
    const placeholder = createWordPlaceholder(wordElement, rect);
    const originalStyle = wordElement.getAttribute("style");

    wordElement.parentNode.insertBefore(placeholder, wordElement);
    document.body.append(wordElement);
    wordElement.classList.add("task-key--dragging");
    wordElement.style.position = "fixed";
    wordElement.style.left = rect.left + "px";
    wordElement.style.top = rect.top + "px";
    wordElement.style.width = rect.width + "px";
    wordElement.style.height = rect.height + "px";
    wordElement.style.margin = "0";
    wordElement.style.zIndex = "9999";
    wordElement.style.pointerEvents = "none";
    document.body.classList.add("is-word-dragging");

    return {
      offsetX: pointerX - rect.left,
      offsetY: pointerY - rect.top,
      originalStyle: originalStyle,
      placeholder: placeholder,
      wordElement: wordElement,
    };
  }

  function moveFloatingWordDrag(dragState, pointerX, pointerY) {
    if (!dragState || !dragState.wordElement) {
      return;
    }

    dragState.wordElement.style.left = pointerX - dragState.offsetX + "px";
    dragState.wordElement.style.top = pointerY - dragState.offsetY + "px";
  }

  function endFloatingWordDrag(dragState) {
    if (!dragState || !dragState.wordElement) {
      return;
    }

    dragState.wordElement.classList.remove("task-key--dragging");

    if (dragState.originalStyle === null) {
      dragState.wordElement.removeAttribute("style");
    } else {
      dragState.wordElement.setAttribute("style", dragState.originalStyle);
    }

    document.body.classList.remove("is-word-dragging");
  }

  function settleFloatingWordDrag(dragState, containers, mutateDom, durationMs) {
    if (!dragState || !dragState.wordElement) {
      mutateDom();
      return;
    }

    const animationDuration = Number.isFinite(durationMs) ? durationMs : 200;
    const nodesBeforeMove = collectWordKeyNodes(containers).filter(function (node) {
      return node !== dragState.wordElement;
    });
    const startingRects = new Map();

    for (const node of nodesBeforeMove) {
      startingRects.set(node, node.getBoundingClientRect());
    }

    startingRects.set(dragState.wordElement, dragState.wordElement.getBoundingClientRect());
    endFloatingWordDrag(dragState);
    mutateDom();

    const nodesAfterMove = collectWordKeyNodes(containers);
    animateWordNodes(nodesAfterMove, startingRects, animationDuration);
  }

  function isPointInsideElement(element, pointerX, pointerY) {
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

  function findWordInsertBeforeNode(container, pointerX, pointerY, ignoredNode) {
    if (!container) {
      return null;
    }

    const wordNodes = Array.from(container.querySelectorAll(".task-key")).filter(function (node) {
      return node !== ignoredNode;
    });

    for (const node of wordNodes) {
      const rect = node.getBoundingClientRect();
      const isNearNodeRow =
        pointerY >= rect.top - rect.height * 0.35 &&
        pointerY <= rect.bottom + rect.height * 0.35;

      if (isNearNodeRow && pointerX <= rect.left + rect.width / 2) {
        return node;
      }

      if (pointerY < rect.top + rect.height / 2) {
        return node;
      }
    }

    return null;
  }

  globalObject.lessonSharedUtils = {
    animateWordNodes: animateWordNodes,
    beginFloatingWordDrag: beginFloatingWordDrag,
    cloneTemplateElement: cloneTemplateElement,
    createWordKey: createWordKey,
    endFloatingWordDrag: endFloatingWordDrag,
    findWordInsertBeforeNode: findWordInsertBeforeNode,
    isPointInsideElement: isPointInsideElement,
    moveFloatingWordDrag: moveFloatingWordDrag,
    normalizeInlineText: normalizeInlineText,
    runFlipAnimation: runFlipAnimation,
    setContinueEnabled: setContinueEnabled,
    settleFloatingWordDrag: settleFloatingWordDrag,
    shuffleInPlace: shuffleInPlace,
  };
})(window);
