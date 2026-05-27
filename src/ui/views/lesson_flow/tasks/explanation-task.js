import { t } from "../../../../i18n/index.js";

const ALLOWED_EXPLANATION_TAGS = new Set([
  "blockquote",
  "br",
  "code",
  "em",
  "h2",
  "h3",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
]);

function sanitizeExplanationNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return document.createDocumentFragment();
  }

  const tagName = node.tagName.toLowerCase();
  const fragment = document.createDocumentFragment();

  if (!ALLOWED_EXPLANATION_TAGS.has(tagName)) {
    for (const child of node.childNodes) {
      fragment.append(sanitizeExplanationNode(child));
    }

    return fragment;
  }

  const safeElement = document.createElement(tagName);

  for (const child of node.childNodes) {
    safeElement.append(sanitizeExplanationNode(child));
  }

  return safeElement;
}

function renderExplanation(container, content) {
  const sourceDocument = new DOMParser().parseFromString(
    content || t("lesson.emptyExplanation"),
    "text/html",
  );
  const fragment = document.createDocumentFragment();

  for (const node of sourceDocument.body.childNodes) {
    fragment.append(sanitizeExplanationNode(node));
  }

  container.replaceChildren(fragment);
}

export function loadTask(elements, mountTask, content) {
  mountTask("tpl-explanation", (root) => {
    renderExplanation(root.querySelector(".explanation-content"), content);
    elements.continueBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
