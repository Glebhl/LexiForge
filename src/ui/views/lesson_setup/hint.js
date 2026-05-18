const hints = [
  [
    "Specify your level and goal (",
    { code: "A2 travel" },
    ", ",
    { code: "B1 conversation" },
    ").",
  ],
  [
    "Choose a topic and format (",
    { code: "food vocabulary" },
    ", ",
    { code: "short sentences" },
    ").",
  ],
  [
    "Include the situation (",
    { code: "at the airport" },
    ", ",
    { code: "doctor appointment" },
    ").",
  ],
  [
    "Request difficulty and pace (",
    { code: "simple sentences" },
    ", ",
    { code: "challenge me" },
    ").",
  ],
  [
    "Focus on a grammar point (",
    { code: "present perfect" },
    ", ",
    { code: "conditionals" },
    ").",
  ],
  [
    "Set the number of new words (",
    { code: "teach 10 B2 words" },
    ", ",
    { code: "5 new B1 words" },
    ").",
  ],
  [
    "Pick a register (",
    { code: "formal" },
    ", ",
    { code: "casual" },
    ", ",
    { code: "business" },
    ").",
  ],
  [
    "Ask for phrasal verbs by theme (",
    { code: "phrasal verbs for work" },
    ", ",
    { code: "for travel" },
    ").",
  ],
  [
    "Include your interests (",
    { code: "music" },
    ", ",
    { code: "gaming" },
    ", ",
    { code: "fitness" },
    ").",
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
      fragment.append(part);
      return;
    }

    const codeElement = document.createElement("code");
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
