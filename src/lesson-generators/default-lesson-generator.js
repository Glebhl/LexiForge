import { GoalsGenerator, PlanGenerator } from "../pipeline/index.js"

export class DefaultLessonGenerator {
  constructor() {
    this.onFirstTaskAppeared = null;
    this.onNewTaskAppeared = null;
    this.stages = ["presentation"];
    this.stagesAmount = 3;
    this.stageIdx = -1;
  }
  
  subscribeFirstTaskAppeared(callback) {
    this.onFirstTaskAppeared = callback;
  }
  
  subscribeNewTaskAppeared(callback) {
    this.onNewTaskAppeared = callback;
  }
  
  async generateLesson(lessonSettings) {
    console.debug("Starting lesson generation with settings", lessonSettings);
    const goalsGenerator = await GoalsGenerator.create(lessonSettings.lessonLanguage);
    lessonSettings["goals"] = await goalsGenerator.generate(lessonSettings);
    console.debug("Generated lesson goals:\n", lessonSettings.goals)
    requestNextStage();
  }

  async requestNextStage() {
    this.stageIdx++;
    const stageId = this.stages[this.stageIdx];
    console.debug(`Generating stage #${this.stageIdx} ${stageId}`);
    const planGenerator = await PlanGenerator.create(lessonSettings.lessonLanguage, stageId);
    for await (const exercise of planGenerator.generate(lessonSettings)) {
      console.log(exercise);
    }
  }
}
