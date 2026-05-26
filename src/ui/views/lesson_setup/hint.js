const hints = [
  [
    "Ask for a focused card deck: ",
    { code: "8 B1 travel verbs" },
    " or ",
    { code: "6 C1 negotiation words" },
    ".",
  ],
  [
    "Mix vocabulary and grammar when both matter: ",
    { code: "B2 work + conditionals" },
    " or ",
    { code: "A2 food + articles" },
    ".",
  ],
  [
    "Use a real situation so examples feel usable: ",
    { code: "airport security, A2" },
    " or ",
    { code: "meeting small talk, B1" },
    ".",
  ],
  [
    "Say whether you want grammar cards or vocab cards: ",
    { code: "Present Perfect" },
    " or ",
    { code: "B2 interview words" },
    ".",
  ],
  [
    "Ask for contrasts when similar items blur together: ",
    { code: "borrow vs lend" },
    " or ",
    { code: "in time vs on time" },
    ".",
  ],
  [
    "Paste exact targets if you already know them: ",
    { code: "depend on, deal with" },
    " or ",
    { code: "although, despite" },
    ".",
  ],
  [
    "Add register or tone for better card choices: ",
    { code: "casual disagreement, B2" },
    " or ",
    { code: "formal emails, B1" },
    ".",
  ],
  [
    "Ask for one word in a specific context: ",
    { code: "charge: phones" },
    " or ",
    { code: "run: business" },
    ".",
  ],
  [
    "Shape the deck around something you actually care about: ",
    { code: "B1 gaming, 7 cards" },
    " or ",
    { code: "C1 psychology idioms" },
    ".",
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
    if (typeof part === "string") {
      const textElement = document.createElement("span");
      textElement.className = "hint-copy";
      textElement.textContent = part;
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
