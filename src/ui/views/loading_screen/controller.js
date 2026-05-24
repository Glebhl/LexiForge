import { createLessonGenerator } from "../../../lesson-generators/index.js";
import { notify } from "../../notifications.js";
import { wasNotified } from "../../json-parse.js";

function getElements() {
  return {
    btnStop: document.getElementById("btn-stop"),
    title: document.querySelector(".container h1"),
    description: document.querySelector(".description"),
  };
}

export class Controller {
  constructor() {
    this.router = null;
    this.lessonGenerator = null;
    this.elements = {};
    this.cancelled = false;
    this.handleStopClick = this.stopGeneration.bind(this);
  }

  async mount(router, lessonSettings = {}) {
    this.router = router;
    this.elements = getElements();
    this.elements.btnStop.addEventListener("click", this.handleStopClick);
    this.lessonGenerator = createLessonGenerator(
      lessonSettings.lessonGeneratorId,
    );
    this.lessonGenerator.subscribeFirstTaskAppeared(
      this.onFirstTaskAppeared.bind(this),
    );
    this.lessonGenerator.generateLesson(lessonSettings).catch(async (error) => {
      if (!this.cancelled) {
        await this.showGenerationError(error);
      }
    });
  }

  async onFirstTaskAppeared() {
    if (this.cancelled) {
      return;
    }

    console.log("Opening lesson flow page");
    await this.router.navigateTo({
      path: "/lesson",
      addToHistory: false,
      options: { lessonGenerator: this.lessonGenerator },
    });
  }

  async unmount() {
    this.elements.btnStop?.removeEventListener("click", this.handleStopClick);
  }

  async stopGeneration() {
    this.cancelled = true;
    await this.router.goBack();
  }

  async showGenerationError(error) {
    const message = error.message || "Check the API key and try again.";
    const alreadyNotified = wasNotified(error);

    if (alreadyNotified) {
      const previousRoute = await this.router.goBack();
      if (previousRoute !== null) {
        return;
      }
    }

    if (!alreadyNotified) {
      notify.error(message, { title: "Lesson generation failed" });
    }
    const previousRoute = await this.router.goBack();

    if (previousRoute !== null) {
      return;
    }

    this.elements.title.textContent = "Could not generate the lesson";
    this.elements.description.textContent = message;
    this.elements.btnStop.textContent = "Back";
  }
}
