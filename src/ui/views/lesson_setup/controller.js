import { addCard, getAllCards } from "./cards.js";
import { getSettingsValue, loadSettings } from "./settings.js";
import { showHint } from "./hint.js";
import { initLessonSetupTabs } from "./tabs.js";
import { CardsGenerator } from "../../../pipeline/index.js";

const elements = {
  btnGenerate: document.getElementById("btn-go"),
  btnStart: document.getElementById("btn-start"),
  prompt: document.getElementById("prompt"),
};

const testCards = [
  {
    lexeme: "ambiguous",
    lexical_unit: "word",
    part_of_speech: "adjective",
    level: "B2",
    transcription: "/æmˈbɪɡjuəs/",
    translation: "двусмысленный",
    definition: "имеющий несколько возможных значений",
    definition_english: "having several possible meanings",
    example: 'The ending of the movie was ambiguous and left us with many questions.',
  },
  {
    lexeme: "inevitable",
    lexical_unit: "word",
    part_of_speech: "adjective",
    level: "B2",
    transcription: "/æmˈbɪɡjuəs/",
    translation: "неизбежный",
    definition: "то, чего нельзя избежать",
    definition_english: "something that cannot be avoided",
    example: 'It was an inevitable consequence of his actions.',
  },
  {
    lexeme: "subtle",
    lexical_unit: "word",
    part_of_speech: "adjective",
    level: "B2",
    transcription: "/æmˈbɪɡjuəs/",
    translation: "тонкий, едва заметный",
    definition: "неявный или трудноуловимый",
    definition_english: "implicit or elusive",
    example: 'There is a subtle difference between these two shades of blue.',
  },
  {
    lexeme: "resilient",
    lexical_unit: "word",
    part_of_speech: "adjective",
    level: "B2",
    transcription: "/æmˈbɪɡjuəs/",
    translation: "устойчивый, жизнестойкий",
    definition: "способный быстро восстанавливаться после трудностей",
    definition_english: "able to recover quickly from difficulties",
    example: 'The ending of the movie was ambiguous and left us with many questions.',
  },
  {
    lexeme: "mitigate",
    lexical_unit: "word",
    part_of_speech: "verb",
    level: "B2",
    transcription: "/æmˈbɪɡjuəs/",
    translation: "смягчать, уменьшать",
    definition: "делать что-то менее серьезным или суровым",
    definition_english: "make something less serious or severe",
    example: 'The government is trying to mitigate the effects of the crisis.',
  },
]

export class Controller {
  learnerLanguage = "ru";
  lessonLanguage = "en";

  constructor() {
    this.router;
    this.cardsGenerator;
  }

  // Options are always empty for this page
  async mount(router, options = {}) {
    this.router = router;
    this.cardsGenerator = await CardsGenerator.create(this.lessonLanguage);
    initLessonSetupTabs();
    loadSettings();
    showHint();

    testCards.forEach(addCard);
    
    elements.btnGenerate.addEventListener("click", this.startLesson.bind(this));
    elements.btnStart.addEventListener("click", this.startLesson.bind(this));
  }

  async unmount() {

  }

  formatCards() {
    const cards = getAllCards();
    const lines = [];

    cards.forEach((card) => {
      lines.push(`lexeme=${card.lexeme}, part_of_speech=${card.part_of_speech}, definition="${card.definition_english}"`); 
    });

    return lines.join("\n");
  }

  async startLesson() {
    const lessonSettings = {
      lessonLanguage: this.lessonLanguage,
      learnerLanguage: this.learnerLanguage,
      learnerLevel: getSettingsValue("languageLevel"),
      learnerRequest: getSettingsValue("additionalRequest"),
      disabledExercises: getSettingsValue("disabledTaskIds"),
      cards: this.formatCards(),
    }
    this.router.navigateTo({ path: "/loading", options: lessonSettings });
  }

  async generateCards() {
    const learnerRequest = elements.prompt.value;
    if (!learnerRequest) {
      console.warn("Lesson request was not provided");
      return;
    }
    await this.cardsGenerator.generate({ learnerRequest, learnerLanguage: this.learnerLanguage, callback: addCard });
  }
}
