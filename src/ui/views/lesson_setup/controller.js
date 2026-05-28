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
import { getLessonLanguage } from "../../../storage/index.js";
import { t } from "../../../i18n/index.js";
import { parseJsonSafely } from "../../json-parse.js";
import { notify } from "../../notifications.js";

const LESSON_LANGUAGE_CHIPS = Object.freeze({
  de_DE: {
    flagSrc: new URL("../../assets/icons/flagpack/de.svg", import.meta.url)
      .href,
    label: "DE",
  },
  en_US: {
    flagSrc: new URL("../../assets/icons/flagpack/us.svg", import.meta.url)
      .href,
    label: "AmE",
  },
});

function getElements() {
  return {
    btnGenerate: document.getElementById("btn-go"),
    btnStart: document.getElementById("btn-start"),
    languageChip: document.getElementById("lesson-language-chip"),
    languageFlag: document.getElementById("lesson-language-flag"),
    languageLabel: document.getElementById("lesson-language-label"),
    prompt: document.getElementById("prompt"),
  };
}

export class Controller {
  learnerLanguage = "ru";
  lessonLanguage = getLessonLanguage();

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
    updateLessonLanguageChip(this.elements, this.lessonLanguage);
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
      console.warn(t("setup.requestMissingLog"));
      notify.warning(t("setup.addLessonRequest"));
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
          title: t("notifications.skippedInvalidLlmResponse"),
        });

        if (!item) {
          continue;
        }

        if (typeof item.warning === "string") {
          notify.warning(item.warning, {
            title: t("notifications.cardGenerationWarning"),
          });
          continue;
        }

        if (isGeneratedCard(item)) {
          addCard(item);
          continue;
        }
      }
    } catch (error) {
      const message = error.message || t("setup.couldNotGenerateCards");
      notify.error(message, { title: t("notifications.cardGenerationFailed") });
    } finally {
      this.elements.btnGenerate.disabled = false;
    }
  }
}

function updateLessonLanguageChip(elements, lessonLanguage) {
  const languageChip = LESSON_LANGUAGE_CHIPS[lessonLanguage];

  if (!languageChip) {
    return;
  }

  if (elements.languageFlag) {
    elements.languageFlag.src = languageChip.flagSrc;
  }

  if (elements.languageLabel) {
    elements.languageLabel.textContent = languageChip.label;
  }

  if (elements.languageChip) {
    elements.languageChip.title = lessonLanguage;
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
