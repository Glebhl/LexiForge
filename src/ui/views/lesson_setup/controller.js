import { addCard } from "./cards.js";
import { loadSettings } from "./settings.js";
import { showHint } from "./hint.js";
import { initLessonSetupTabs } from "./tabs.js";

const elements = {
  btnGenerate: document.getElementById("btn-go"),
  btnStart: document.getElementById("btn-start"),
};

const testCard = {
  word: "negotiate",
  unit: "negotiate",
  part: "verb",
  level: "B2",
  transcription: "/nəˈɡəʊʃieɪt/",
  translation: "вести переговоры",
  definition: "To discuss something in order to reach an agreement.",
  example: '"We need to negotiate the contract terms."',
}

export class Controller {
  constructor() {
    this.router;
  }

  // Options are empty for initial page
  async mount(router, options = {}) {
    this.router = router;
    elements.btnGenerate.addEventListener("click", () => addCard(testCard));
    initLessonSetupTabs();
    loadSettings(options.settings);
    showHint();
  }

  async unmount() {
  }
}
