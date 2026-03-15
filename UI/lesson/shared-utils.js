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

  globalObject.lessonSharedUtils = {
    cloneTemplateElement: cloneTemplateElement,
    createWordKey: createWordKey,
    normalizeInlineText: normalizeInlineText,
    runFlipAnimation: runFlipAnimation,
    setContinueEnabled: setContinueEnabled,
    shuffleInPlace: shuffleInPlace,
  };
})(window);
