import { GoalsGenerator, PlanGenerator, ContentGenerator } from "../pipeline/index.js"

export class DefaultLessonGenerator {
  constructor() {
    this.onFirstTaskAppeared = null;
    this.onNewTaskAppeared = null;
    this.onLastTaskAppeared = null;
    this.stages = ["presentation"];
    this.stagesAmount = this.stages.length;
    this.stageIdx = -1;
    this.contentGenerator;
    this.lessonSettings;
  }
  
  subscribeFirstTaskAppeared(callback) {
    this.onFirstTaskAppeared = callback;
  }
  
  subscribeNewTaskAppeared(callback) {
    this.onNewTaskAppeared = callback;
  }

  subscribeLastTaskAppeared(callback) {
    this.onLastTaskAppeared = callback;
  }
  
  async generateLesson(lessonSettings) {
    console.debug("Starting lesson generation with settings", lessonSettings);
    this.lessonSettings = lessonSettings;
    const goalsGenerator = await GoalsGenerator.create(lessonSettings.lessonLanguage);
    this.contentGenerator = await ContentGenerator.create(lessonSettings.lessonLanguage);
    lessonSettings["goals"] = await goalsGenerator.generate(lessonSettings);
    console.debug("Generated lesson goals:\n", lessonSettings.goals)
    await this.requestNextStage();
  }

  async requestNextStage() {
    this.stageIdx++;
    const stageId = this.stages[this.stageIdx];
    console.debug(`Generating stage #${this.stageIdx} ${stageId}`);
    const planGenerator = await PlanGenerator.create(this.lessonSettings.lessonLanguage, stageId);
    let exerciseIdx = 0;
    for await (const exercise of planGenerator.generate(this.lessonSettings)) {
      const exerciseContent = await this.contentGenerator.generate(exercise)
      if (this.stageIdx === 0 && exerciseIdx === 0) {
        console.debug("Fisrt task appeared");
        await this.onFirstTaskAppeared();
      }
      console.debug("A new exercise appeared:", exerciseContent);
      await this.onNewTaskAppeared(exercise.exercise_id, exerciseContent);
      exerciseIdx++;
    }
    await this.onLastTaskAppeared();
    return this.stageIdx;
  }
}