import {
  GoalsGenerator,
  PlanGenerator,
  ContentGenerator,
} from "../pipeline/index.js";

const noop = async () => {};
const callbackOrNoop = (callback) =>
  typeof callback === "function" ? callback : noop;
const PROMPT_GENERATORS_ROOT = "lesson/generators";

export class LessonGenerator {
  constructor({ stages, generatorId, progressEnabled = true } = {}) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error("Lesson generator stages were not provided");
    }

    if (!generatorId) {
      throw new Error("Lesson generator id was not provided");
    }

    this.onFirstTaskAppeared = noop;
    this.onNewTaskAppeared = noop;
    this.onLastTaskAppeared = noop;
    this.stages = [...stages];
    this.generatorId = generatorId;
    this.stagesAmount = this.stages.length;
    this.progressEnabled = progressEnabled;
    this.stageIdx = -1;
    this.contentGenerator = null;
    this.lessonSettings = null;
  }

  subscribeFirstTaskAppeared(callback) {
    this.onFirstTaskAppeared = callbackOrNoop(callback);
  }

  subscribeNewTaskAppeared(callback) {
    this.onNewTaskAppeared = callbackOrNoop(callback);
  }

  subscribeLastTaskAppeared(callback) {
    this.onLastTaskAppeared = callbackOrNoop(callback);
  }

  async generateLesson(lessonSettings) {
    console.debug("Starting lesson generation with settings", lessonSettings);
    this.lessonSettings = await this.buildLessonSettings(lessonSettings);
    this.contentGenerator = await ContentGenerator.create(this.lessonSettings);
    console.debug("Generated lesson goals:\n", this.lessonSettings.goals);
    await this.requestNextStage();
  }

  async requestNextStage() {
    const stageId = this.getNextStageId();
    console.debug(`Generating stage #${this.stageIdx} ${stageId}`);

    let exerciseIdx = 0;
    for await (const exercise of this.generateStagePlan(stageId)) {
      await this.generateExercise(exercise, exerciseIdx, {
        stageId,
        stageIdx: this.stageIdx,
      });
      exerciseIdx++;
    }

    await this.onLastTaskAppeared({
      stageId,
      stageIdx: this.stageIdx,
      exerciseCount: exerciseIdx,
    });
    return this.stageIdx;
  }

  async buildLessonSettings(lessonSettings) {
    const goalsGenerator = await GoalsGenerator.create(
      lessonSettings.lessonLanguage,
      {
        promptPath: `${PROMPT_GENERATORS_ROOT}/${this.generatorId}/goals_generate.txt`,
      },
    );
    const goals = await goalsGenerator.generate(lessonSettings);
    return { ...lessonSettings, goals };
  }

  getNextStageId() {
    const nextStageIdx = this.stageIdx + 1;
    const stageId = this.stages[nextStageIdx];

    if (!stageId) {
      throw new Error(`No lesson stage found at index ${nextStageIdx}`);
    }

    this.stageIdx = nextStageIdx;
    return stageId;
  }

  async *generateStagePlan(stageId) {
    const planGenerator = await PlanGenerator.create(
      this.lessonSettings.lessonLanguage,
      stageId,
      {
        promptDirectory: `${PROMPT_GENERATORS_ROOT}/${this.generatorId}/stages`,
      },
    );
    yield* planGenerator.generate(this.lessonSettings);
  }

  async generateExercise(exercise, exerciseIdx, stageMeta) {
    const exerciseContent = await this.contentGenerator.generate(exercise);

    if (this.isFirstExercise(exerciseIdx)) {
      console.debug("First task appeared");
      await this.onFirstTaskAppeared();
    }

    console.debug("A new exercise appeared:", exerciseContent);
    await this.onNewTaskAppeared(exercise.exercise_id, exerciseContent, {
      ...stageMeta,
      exerciseIdx,
      mode: exercise.mode,
    });
  }

  isFirstExercise(exerciseIdx) {
    return this.stageIdx === 0 && exerciseIdx === 0;
  }
}
