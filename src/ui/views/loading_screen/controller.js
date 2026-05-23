import { DefaultLessonGenerator } from "../../../lesson-generators/default-lesson-generator.js";
import { notify } from "../../notifications.js";

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
    this.lessonGenerator = new DefaultLessonGenerator();
    this.lessonGenerator.subscribeFirstTaskAppeared(
      this.onFirstTaskAppeared.bind(this),
    );
    this.lessonGenerator.generateLesson(lessonSettings).catch((error) => {
      if (!this.cancelled) {
        this.showGenerationError(error);
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

  showGenerationError(error) {
    const message = error.message || "Check the API key and try again.";

    this.elements.title.textContent = "Could not generate the lesson";
    this.elements.description.textContent = message;
    this.elements.btnStop.textContent = "Back";
    notify.error(message, { title: "Lesson generation failed" });
  }
}
