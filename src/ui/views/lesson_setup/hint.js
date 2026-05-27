import { t } from "../../../i18n/index.js";

const hints = [
  [
    { key: "setup.hints.focused.start" },
    { code: "8 B1 travel verbs" },
    { key: "setup.hints.focused.middle" },
    { code: "6 C1 negotiation words" },
    { key: "setup.hints.focused.end" },
  ],
  [
    { key: "setup.hints.mixed.start" },
    { code: "B2 work + conditionals" },
    { key: "setup.hints.mixed.middle" },
    { code: "A2 food + articles" },
    { key: "setup.hints.mixed.end" },
  ],
  [
    { key: "setup.hints.situation.start" },
    { code: "airport security, A2" },
    { key: "setup.hints.situation.middle" },
    { code: "meeting small talk, B1" },
    { key: "setup.hints.situation.end" },
  ],
  [
    { key: "setup.hints.cardType.start" },
    { code: "Present Perfect" },
    { key: "setup.hints.cardType.middle" },
    { code: "B2 interview words" },
    { key: "setup.hints.cardType.end" },
  ],
  [
    { key: "setup.hints.contrasts.start" },
    { code: "borrow vs lend" },
    { key: "setup.hints.contrasts.middle" },
    { code: "in time vs on time" },
    { key: "setup.hints.contrasts.end" },
  ],
  [
    { key: "setup.hints.exactTargets.start" },
    { code: "depend on, deal with" },
    { key: "setup.hints.exactTargets.middle" },
    { code: "although, despite" },
    { key: "setup.hints.exactTargets.end" },
  ],
  [
    { key: "setup.hints.tone.start" },
    { code: "casual disagreement, B2" },
    { key: "setup.hints.tone.middle" },
    { code: "formal emails, B1" },
    { key: "setup.hints.tone.end" },
  ],
  [
    { key: "setup.hints.context.start" },
    { code: "charge: phones" },
    { key: "setup.hints.context.middle" },
    { code: "run: business" },
    { key: "setup.hints.context.end" },
  ],
  [
    { key: "setup.hints.interest.start" },
    { code: "B1 gaming, 7 cards" },
    { key: "setup.hints.interest.middle" },
    { code: "C1 psychology idioms" },
    { key: "setup.hints.interest.end" },
  ],
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function showHint(index) {
  if (index === undefined || index > hints.length - 1) {
    index = getRandomInt(0, hints.length - 1);
  }

  renderHint(hints[index]);
}

export function showHintText(message) {
  getHintElement().textContent = message;
}

function renderHint(parts) {
  const hintElement = getHintElement();
  const fragment = document.createDocumentFragment();

  parts.forEach((part) => {
    if (typeof part === "string" || part.key) {
      const textElement = document.createElement("span");
      textElement.className = "hint-copy";
      textElement.textContent = part.key ? t(part.key) : part;
      fragment.append(textElement);
      return;
    }

    const codeElement = document.createElement("code");
    codeElement.className = "hint-chip";
    codeElement.textContent = part.code;
    fragment.append(codeElement);
  });

  hintElement.replaceChildren(fragment);
}

function getHintElement() {
  const hintElement = document.getElementById("hint");

  if (!hintElement) {
    throw new Error("Lesson setup hint view is not mounted");
  }

  return hintElement;
}
