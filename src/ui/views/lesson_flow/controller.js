import {
  appendExercise,
  bindExerciseLoader,
  finishStage,
  setStagesAmount,
  showNextExercise,
  unbindExerciseLoader,
} from "./exercise-load.js";

function getElements() {
  return {
    container: document.getElementById("taskStage"),
    btnContinue: document.getElementById("continue"),
    btnSkip: document.getElementById("skip"),
  };
}

function isVerifierPassed(result) {
  return result === true || result === "correct" || result === "minor";
}

export class Controller {
  constructor() {
    this.router = null;
    this.lessonGenerator = null;
    this.exerciseVerifier = null;
    this.elements = {};
    this.isFinalInStage = false;
    this.isCheckingAnswer = false;
    this.stageIdx = -1;
    this.handleContinueClick = this.onContinueClick.bind(this);
    this.handleSkipClick = this.onSkipClick.bind(this);
  }

  async mount(router, options = {}) {
    this.router = router;
    this.lessonGenerator = options.lessonGenerator;

    if (!this.lessonGenerator) {
      throw new Error("Lesson generator was not provided");
    }

    this.elements = getElements();
    bindExerciseLoader({
      container: this.elements.container,
      continueBtn: this.elements.btnContinue,
      skipBtn: this.elements.btnSkip,
    });
    this.lessonGenerator.subscribeNewTaskAppeared(
      this.appendExercise.bind(this),
    );
    this.lessonGenerator.subscribeLastTaskAppeared(finishStage);
    this.stageIdx = this.lessonGenerator.stageIdx;
    setStagesAmount(this.lessonGenerator.stagesAmount);
    this.elements.btnContinue.addEventListener(
      "click",
      this.handleContinueClick,
    );
    this.elements.btnSkip.addEventListener("click", this.handleSkipClick);
    this.showNextExercise();
  }

  async unmount() {
    this.elements.btnContinue?.removeEventListener(
      "click",
      this.handleContinueClick,
    );
    this.elements.btnSkip?.removeEventListener("click", this.handleSkipClick);
    unbindExerciseLoader();
  }

  async appendExercise(exercise_id, content) {
    appendExercise(exercise_id, content);
  }

  async showNextExercise() {
    if (this.isFinalInStage) {
      if (this.stageIdx === this.lessonGenerator.stagesAmount - 1) {
        console.log("You've completed all exercises");
        this.finishLesson();
        return;
      }
      this.stageIdx = await this.lessonGenerator.requestNextStage();
    }

    [this.isFinalInStage, this.exerciseVerifier] = await showNextExercise();
  }

  async onContinueClick() {
    if (this.isCheckingAnswer) {
      return;
    }

    this.isCheckingAnswer = true;
    try {
      const verifier = this.exerciseVerifier;
      const result = await verifier?.();
      if (this.exerciseVerifier === verifier && isVerifierPassed(result)) {
        await this.showNextExercise();
      }
    } finally {
      this.isCheckingAnswer = false;
    }
  }

  async onSkipClick() {
    await this.showNextExercise();
  }

  finishLesson() {
    this.elements.btnContinue.disabled = true;
    this.elements.btnSkip.disabled = true;
    this.elements.btnContinue.textContent = "Done";
  }
}
