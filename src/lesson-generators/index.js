export { LessonGenerator } from "./lesson-generator.js";
export { DefaultLessonGenerator } from "./default-lesson-generator.js";
export { ReviewLessonGenerator } from "./review-lesson-generator.js";

import { DefaultLessonGenerator } from "./default-lesson-generator.js";
import { ReviewLessonGenerator } from "./review-lesson-generator.js";

const DEFAULT_LESSON_GENERATOR_ID = "default";

export const LESSON_GENERATOR_OPTIONS = [
  {
    id: "default",
    label: "Default",
    description: "Teach new vocabulary and grammar from the current deck.",
  },
  {
    id: "review",
    label: "Review",
    description: "Review previously studied vocabulary and grammar.",
  },
];

const LESSON_GENERATOR_FACTORIES = {
  default: () => new DefaultLessonGenerator({ generatorId: "default" }),
  review: () => new ReviewLessonGenerator({ generatorId: "review" }),
};

export function createLessonGenerator(
  generatorId,
) {
  const factory = LESSON_GENERATOR_FACTORIES[generatorId];
  if (!factory) {
    throw new Error(`Couldn't load lesson generator ${generatorId}`);
  }
  console.log(`Loaded lesson generator ${generatorId}`);

  return factory();
}
