import { LessonGenerator } from "./lesson-generator.js";

const REVIEW_STAGES = [
  "review_diagnosis",
  "review_repair",
  "review_active_recall",
];
const REVIEW_GENERATOR_ID = "review";

export class ReviewLessonGenerator extends LessonGenerator {
  constructor({
    stages = REVIEW_STAGES,
    generatorId = REVIEW_GENERATOR_ID,
    progressEnabled = true,
  } = {}) {
    super({ stages, generatorId, progressEnabled });
  }
}
