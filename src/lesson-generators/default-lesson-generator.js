import { LessonGenerator } from "./lesson-generator.js";

const DEFAULT_STAGES = ["presentation", "recognition", "stronger_recall"];
const DEFAULT_GENERATOR_ID = "default";

export class DefaultLessonGenerator extends LessonGenerator {
  constructor({
    stages = DEFAULT_STAGES,
    generatorId = DEFAULT_GENERATOR_ID,
    progressEnabled = true,
  } = {}) {
    super({ stages, generatorId, progressEnabled });
  }
}
