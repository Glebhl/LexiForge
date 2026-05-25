import {
  addCard,
  bindCards,
  clearAllCards,
  getAllCards,
  unbindCards,
} from "./cards.js";
import { destroySettings, getSettingsValue, loadSettings } from "./settings.js";
import { showHint, showHintText } from "./hint.js";
import { initLessonSetupTabs } from "./tabs.js";
import { LESSON_GENERATOR_OPTIONS } from "../../../lesson-generators/index.js";
import { CardsGenerator } from "../../../pipeline/index.js";
import { parseJsonSafely } from "../../json-parse.js";
import { notify } from "../../notifications.js";

function getElements() {
  return {
    btnGenerate: document.getElementById("btn-go"),
    btnStart: document.getElementById("btn-start"),
    prompt: document.getElementById("prompt"),
  };
}

export class Controller {
  learnerLanguage = "ru";
  lessonLanguage = "en_US";

  constructor() {
    this.router = null;
    this.cardsGenerator = null;
    this.elements = {};
    this.handleGenerateClick = this.generateCards.bind(this);
    this.handleStartClick = this.startLesson.bind(this);
  }

  async mount(router) {
    this.router = router;
    this.elements = getElements();

    bindCards();
    clearAllCards();
    initLessonSetupTabs();
    loadSettings({ lessonGenerators: LESSON_GENERATOR_OPTIONS });
    showHint();

    this.cardsGenerator = await CardsGenerator.create(this.lessonLanguage);
    this.elements.btnGenerate.addEventListener(
      "click",
      this.handleGenerateClick,
    );
    this.elements.btnStart.addEventListener("click", this.handleStartClick);
  }

  async unmount() {
    this.elements.btnGenerate?.removeEventListener(
      "click",
      this.handleGenerateClick,
    );
    this.elements.btnStart?.removeEventListener("click", this.handleStartClick);
    destroySettings();
    unbindCards();
  }

  async startLesson() {
    const lessonSettings = {
      lessonLanguage: this.lessonLanguage,
      learnerLanguage: this.learnerLanguage,
      learnerLevel: getSettingsValue("languageLevel"),
      learnerRequest: getSettingsValue("additionalRequest"),
      disabledExercises: getSettingsValue("disabledTaskIds"),
      lessonGeneratorId: getSettingsValue("lessonGeneratorId"),
      cards: formatAllCards(),
    };

    await this.router.navigateTo({ path: "/loading", options: lessonSettings });
  }

  async generateCards() {
    const learnerRequest = this.elements.prompt.value.trim();

    if (!learnerRequest) {
      console.warn("Lesson request was not provided");
      notify.warning("Add a lesson request first.");
      return;
    }

    clearAllCards();
    this.elements.btnGenerate.disabled = true;

    try {
      for await (const line of this.cardsGenerator.generate({
        learnerRequest,
        learnerLanguage: this.learnerLanguage,
      })) {
        const item = parseJsonSafely(line, {
          context: "card line from the LLM",
          fallback: null,
          level: "warning",
          throwOnError: false,
          title: "Skipped invalid LLM response",
        });

        if (!item) {
          continue;
        }

        if (typeof item.warning === "string") {
          notify.warning(item.warning, { title: "Card generation warning" });
          continue;
        }

        if (isGeneratedCard(item)) {
          addCard(item);
          continue;
        }
      }
    } catch (error) {
      const message = error.message || "Could not generate cards.";
      notify.error(message, { title: "Card generation failed" });
    } finally {
      this.elements.btnGenerate.disabled = false;
    }
  }
}

function isGeneratedCard(item) {
  return item?.type === "vocab" || item?.type === "grammar";
}

function formatAllCards() {
  const cards = getAllCards();
  return cards.map(formatLearningUnit).filter(Boolean).join("\n");
}

function formatLearningUnit(card) {
  if (card.type === "grammar") {
    return formatGrammarUnit(card);
  }

  return formatVocabUnit(card);
}

function formatVocabUnit(card) {
  return [
    `vocab: lexeme="${card.lexeme || "N/A"}"`,
    `part_of_speech="${card.part_of_speech || "N/A"}"`,
    `definition="${card.definition_english || "N/A"}"`,
  ].join(", ");
}

function formatGrammarUnit(card) {
  return `grammar: item="${card.grammar || "N/A"}"`;
}
