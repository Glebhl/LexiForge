import { appendExercise, showNextExercise, finishStage, setStagesAmount } from "./exercise-load.js"

const elements = {
  btnContinue: document.getElementById("continue"),
  btnSkip: document.getElementById("skip"),
};

export class Controller {
  constructor() {
    this.router;
    this.lessonGenerator;
    this.exerciseVerifier;
    this.isFinalInStage = false;
    this.stageIdx = -1;
  }
  
  async mount(router, options = {}) {
    this.lessonGenerator = options.lessonGenerator;
    this.lessonGenerator.subscribeNewTaskAppeared(this.appendExercise.bind(this));
    this.lessonGenerator.subscribeLastTaskAppeared(finishStage);
    setStagesAmount(this.lessonGenerator.stagesAmount);
    elements.btnContinue.addEventListener("click", this.onContinueClick.bind(this));
    elements.btnSkip.addEventListener("click", this.onSkipClick.bind(this));
  }

  async unmount() {

  }

  async appendExercise(exercise_id, content) {
    appendExercise(exercise_id, content);
  }

  async showNextExercise() {
    if (this.isFinalInStage) {
      if (this.stageIdx === this.lessonGenerator.stagesAmount - 1) {
        console.log("You've completed all exercises");
        return;
      };
      this.stageIdx = this.lessonGenerator.requestNextStage();
    }

    [this.isFinalInStage, this.exerciseVerifier] = await showNextExercise();
  }

  async onContinueClick() {
    this.exerciseVerifier() && await this.showNextExercise();
  }

  async onSkipClick() {
    await this.showNextExercise();
  }
}
