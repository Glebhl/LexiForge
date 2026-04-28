const elements = {
  hint: document.getElementById("hint"),
};

const hints = [
    "Specify your level and goal (<code>A2 travel</code>, <code>B1 conversation</code>).",
    "Choose a topic and format (<code>food vocabulary</code>, <code>short sentences</code>).",
    "Include the situation (<code>at the airport</code>, <code>doctor appointment</code>).",
    "Request difficulty and pace (<code>simple sentences</code>, <code>challenge me</code>).",
    "Focus on a grammar point (<code>present perfect</code>, <code>conditionals</code>).",
    "Set the number of new words (<code>teach 10 B2 words</code>, <code>5 new B1 words</code>).",
    "Pick a register (<code>formal</code>, <code>casual</code>, <code>business</code>).",
    "Ask for phrasal verbs by theme (<code>phrasal verbs for work</code>, <code>for travel</code>).",
    "Include your interests (<code>music</code>, <code>gaming</code>, <code>fitness</code>).",
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function showHint(index) {
  if (index === undefined || index > hints.length - 1) {
    index = getRandomInt(0, hints.length - 1);
  }
  elements.hint.innerHTML = hints[index];
}
