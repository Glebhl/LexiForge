export { LessonGenerator } from "./lesson-generator.js";
export { DefaultLessonGenerator } from "./default-lesson-generator.js";
export { ReviewLessonGenerator } from "./review-lesson-generator.js";

import { DefaultLessonGenerator } from "./default-lesson-generator.js";
import { ReviewLessonGenerator } from "./review-lesson-generator.js";

const DEFAULT_LESSON_GENERATOR_ID = "default";

export const LESSON_GENERATOR_OPTIONS = [
  {
    id: "default",
    labelKey: "lessonGenerators.default.label",
    descriptionKey: "lessonGenerators.default.description",
  },
  {
    id: "review",
    labelKey: "lessonGenerators.review.label",
    descriptionKey: "lessonGenerators.review.description",
  },
];

const LESSON_GENERATOR_FACTORIES = {
  default: () => new DefaultLessonGenerator({ generatorId: "default" }),
  review: () => new ReviewLessonGenerator({ generatorId: "review" }),
};

export function createLessonGenerator(generatorId) {
  const factory = LESSON_GENERATOR_FACTORIES[generatorId];
  if (!factory) {
    throw new Error(`Couldn't load lesson generator ${generatorId}`);
  }
  console.log(`Loaded lesson generator ${generatorId}`);

  return factory();
}
