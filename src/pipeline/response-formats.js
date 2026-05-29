export function jsonSchemaResponseFormat(name, schema) {
  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema,
    },
  };
}

const lessonGoalsSchema = {
  type: "object",
  properties: {
    goals: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["goals"],
  additionalProperties: false,
};

const planStepSchema = {
  type: "object",
  properties: {
    description: { type: "string" },
    exercise_id: {
      type: "string",
      enum: ["explanation", "matching", "filling", "translation", "question"],
    },
    mode: {
      type: "string",
      enum: ["none", "word-bank", "typing"],
    },
  },
  required: ["description", "exercise_id", "mode"],
  additionalProperties: false,
};

const lessonPlanSchema = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: planStepSchema,
    },
  },
  required: ["steps"],
  additionalProperties: false,
};

const vocabCardSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["vocab"] },
    lexeme: { type: "string" },
    lexical_unit: {
      type: "string",
      enum: [
        "word",
        "phrasal verb",
        "idiom",
        "expression",
        "modal verb",
        "collocation",
        "other",
      ],
    },
    part_of_speech: {
      type: "string",
      enum: [
        "noun",
        "verb",
        "adjective",
        "adverb",
        "phrase",
        "idiom",
        "phrasal verb",
        "preposition",
        "other",
      ],
    },
    translation: { type: "string" },
    transcription: { type: "string" },
    level: {
      type: "string",
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
    definition: { type: "string" },
    definition_english: { type: "string" },
    example: { type: "string" },
  },
  required: [
    "type",
    "lexeme",
    "lexical_unit",
    "part_of_speech",
    "translation",
    "transcription",
    "level",
    "definition",
    "definition_english",
    "example",
  ],
  additionalProperties: false,
};

const grammarCardSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["grammar"] },
    grammar: { type: "string" },
    level: {
      type: "string",
      enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
    },
    rule: { type: "string" },
    example: { type: "string" },
  },
  required: ["type", "grammar", "level", "rule", "example"],
  additionalProperties: false,
};

const warningSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["warning"] },
    warning: { type: "string" },
  },
  required: ["type", "warning"],
  additionalProperties: false,
};

const cardsSchema = {
  type: "array",
  items: {
    anyOf: [vocabCardSchema, grammarCardSchema, warningSchema],
  },
};

const translationTaskSchema = {
  type: "object",
  properties: {
    paragraph: { type: "string" },
    answers: {
      type: "array",
      items: { type: "string" },
    },
    distractors: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["paragraph", "answers", "distractors"],
  additionalProperties: false,
};

const readingQuestionTaskSchema = {
  type: "object",
  properties: {
    passage: { type: "string" },
    question: { type: "string" },
    answer: { type: "string" },
    distractors: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["passage", "question", "answer", "distractors"],
  additionalProperties: false,
};

const fillBlankTaskSchema = {
  type: "object",
  properties: {
    paragraph: { type: "string" },
    distractors: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["paragraph", "distractors"],
  additionalProperties: false,
};

const matchingTaskSchema = {
  type: "object",
  properties: {
    pairs: {
      type: "array",
      items: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  required: ["pairs"],
  additionalProperties: false,
};

const explanationTaskSchema = {
  type: "object",
  properties: {
    html: { type: "string" },
  },
  required: ["html"],
  additionalProperties: false,
};

const answerCheckSchema = {
  type: "object",
  properties: {
    evaluation: {
      type: "string",
      enum: ["correct", "minor", "mistake"],
    },
    feedback: {
      type: "string",
    },
  },
  required: ["evaluation", "feedback"],
  additionalProperties: false,
};

export const GOALS_RESPONSE_FORMAT = jsonSchemaResponseFormat(
  "lesson_goals",
  lessonGoalsSchema,
);

export const PLAN_RESPONSE_FORMAT = jsonSchemaResponseFormat(
  "lesson_plan",
  lessonPlanSchema,
);

export const CARDS_RESPONSE_FORMAT = jsonSchemaResponseFormat(
  "learning_cards",
  cardsSchema,
);

export const CONTENT_RESPONSE_FORMATS = {
  question: jsonSchemaResponseFormat(
    "reading_comprehension_task",
    readingQuestionTaskSchema,
  ),
  explanation: jsonSchemaResponseFormat(
    "explanation_task",
    explanationTaskSchema,
  ),
  filling: jsonSchemaResponseFormat("fill_blank_task", fillBlankTaskSchema),
  translation: jsonSchemaResponseFormat(
    "translation_task",
    translationTaskSchema,
  ),
  matching: jsonSchemaResponseFormat("matching_task", matchingTaskSchema),
};

export const ANSWER_CHECK_RESPONSE_FORMAT = jsonSchemaResponseFormat(
  "answer_check",
  answerCheckSchema,
);
