import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import {
  DEFAULT_LESSON_LANGUAGE,
  normalizeLessonLanguage,
  resolvePipelineModel,
} from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { t } from "../i18n/index.js";
import { ANSWER_CHECK_RESPONSE_FORMAT } from "./response-formats.js";

export const CORRECT = "correct";
export const MINOR = "minor";
export const MISTAKE = "mistake";

const DEFAULT_LANGUAGE_CODE = DEFAULT_LESSON_LANGUAGE;
const ANSWER_CHECK_MAX_TOKENS = 128;
const ANSWER_CHECK_REASONIG_EFFORT = "minimal";
const APOSTROPHE_VARIANTS = ["'", "\u2019", "`", "\u02bc"];
const LANGUAGE_CONTRACTION_RULES = {
  en_us: {
    "n't": [" not"],
    "'re": [" are"],
    "'ve": [" have"],
    "'ll": [" will"],
    "'m": [" am"],
    "'d": [" would"],
    "'s": [" is", ""],
  },
};
const IRREGULAR_CONTRACTIONS = {
  "can't": ["cannot", "can not"],
  "won't": ["will not"],
  "shan't": ["shall not"],
};
const PROMPT_FILES = {
  filling: "answer-checking/fill_blank_check.txt",
  translation: "answer-checking/translation_check.txt",
};

const checkers = new Map();

export function isPassingEvaluation(evaluation) {
  return evaluation === CORRECT || evaluation === MINOR;
}

export function isTranslationAnswerCorrect(userAnswer, expectedAnswers) {
  const userForms = buildNormalizedAnswerForms(userAnswer);
  return expectedAnswers.some((expectedAnswer) =>
    hasIntersection(userForms, buildNormalizedAnswerForms(expectedAnswer)),
  );
}

export function isFillingAnswerCorrect(userAnswers, expectedAnswers) {
  if (userAnswers.length !== expectedAnswers.length) {
    return false;
  }

  return expectedAnswers.every((expectedAnswer, index) =>
    hasIntersection(
      buildNormalizedAnswerForms(userAnswers[index]),
      buildNormalizedAnswerForms(expectedAnswer),
    ),
  );
}

export async function evaluateTranslationAnswer(
  originalText,
  userAnswer,
  learnerLanguage,
  lessonLanguage = DEFAULT_LANGUAGE_CODE,
) {
  return getChecker(lessonLanguage).evaluateTranslationAnswer(
    originalText,
    userAnswer,
    learnerLanguage,
  );
}

export async function evaluateFillingAnswer(
  sentenceParts,
  expectedAnswers,
  userAnswers,
  learnerLanguage,
  lessonLanguage = DEFAULT_LANGUAGE_CODE,
) {
  if (userAnswers.length !== expectedAnswers.length) {
    return {
      evaluation: MISTAKE,
      feedback: t("lesson.filling.answerCountMismatch"),
    };
  }

  return getChecker(lessonLanguage).evaluateFillingAnswer(
    sentenceParts,
    expectedAnswers,
    userAnswers,
    learnerLanguage,
  );
}

function getChecker(lessonLanguage) {
  const normalizedLessonLanguage = normalizeLessonLanguage(lessonLanguage);

  if (!checkers.has(normalizedLessonLanguage)) {
    checkers.set(
      normalizedLessonLanguage,
      new AnswerChecker(normalizedLessonLanguage),
    );
  }

  return checkers.get(normalizedLessonLanguage);
}

function hasIntersection(left, right) {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}

function buildNormalizedAnswerForms(text) {
  const normalizedText = normalizeApostrophes(text);
  const variants = new Set([
    normalizedText,
    ...expandApostropheVariants(normalizedText),
  ]);
  const normalizedForms = new Set();

  for (const variant of variants) {
    const signature = alphabeticSignature(variant);
    if (signature) {
      normalizedForms.add(signature);
    }
  }

  return normalizedForms;
}

function expandApostropheVariants(text, languageCode = DEFAULT_LANGUAGE_CODE) {
  const rules = LANGUAGE_CONTRACTION_RULES[languageCode.toLowerCase()] || {};
  const tokenVariants = text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => expandTokenVariants(token, rules));

  if (tokenVariants.length === 0) {
    return [];
  }

  return tokenVariants.reduce(
    (variants, tokens) =>
      variants.flatMap((variant) =>
        tokens.map((token) => `${variant}${variant ? " " : ""}${token}`),
      ),
    [""],
  );
}

function expandTokenVariants(token, rules) {
  const tokenLower = token.toLowerCase();
  if (IRREGULAR_CONTRACTIONS[tokenLower]) {
    return [token, ...IRREGULAR_CONTRACTIONS[tokenLower]];
  }

  const variants = new Set([token]);
  for (const [suffix, replacements] of Object.entries(rules)) {
    if (!tokenLower.endsWith(suffix)) {
      continue;
    }

    const tokenStem = token.slice(0, token.length - suffix.length);
    for (const replacement of replacements) {
      variants.add(`${tokenStem}${replacement}`);
    }
  }

  return [...variants];
}

function normalizeApostrophes(text) {
  let normalized = String(text ?? "");
  for (const apostrophe of APOSTROPHE_VARIANTS) {
    normalized = normalized.replaceAll(apostrophe, "'");
  }
  return normalized;
}

function alphabeticSignature(text) {
  return Array.from(String(text).toLocaleLowerCase())
    .filter((character) => /\p{L}/u.test(character))
    .join("");
}

class AnswerChecker {
  constructor(lessonLanguage = DEFAULT_LANGUAGE_CODE, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.client = new OpenRouterClient(options);
    this.model = resolvePipelineModel("answerChecking", options.model);
    this.prompts = {};
  }

  async evaluateTranslationAnswer(originalText, userAnswer, learnerLanguage) {
    return this.generateEvaluation(
      "translation",
      buildTranslationUserPrompt(originalText, userAnswer, learnerLanguage),
    );
  }

  async evaluateFillingAnswer(
    sentenceParts,
    expectedAnswers,
    userAnswers,
    learnerLanguage,
  ) {
    return this.generateEvaluation(
      "filling",
      buildFillingUserPrompt(
        sentenceParts,
        expectedAnswers,
        userAnswers,
        learnerLanguage,
      ),
    );
  }

  async generateEvaluation(kind, userPrompt) {
    const response = await this.client.chat({
      model: this.model,
      max_tokens: ANSWER_CHECK_MAX_TOKENS,
      response_format: ANSWER_CHECK_RESPONSE_FORMAT,
      messages: [
        { role: "system", content: await this.loadPrompt(kind) },
        { role: "user", content: userPrompt },
      ],
      reasoning: {
        effort: ANSWER_CHECK_REASONIG_EFFORT,
      },
    });
    const content = response.choices?.[0]?.message?.content || "";
    const parsedContent = parseAnswerCheckResponse(content);

    return normalizeAnswerCheck(parsedContent);
  }

  async loadPrompt(kind) {
    if (this.prompts[kind]) {
      return this.prompts[kind];
    }

    this.prompts[kind] = await loadPrompt(
      `${this.lessonLanguage}/${PROMPT_FILES[kind]}`,
    );
    return this.prompts[kind];
  }
}

function normalizeAnswerCheck(value) {
  return {
    evaluation: normalizeEvaluation(value?.evaluation),
    feedback: normalizeFeedback(value?.feedback),
  };
}

function parseAnswerCheckResponse(content) {
  const rawContent = String(content || "");
  const jsonContent = extractFirstJsonObject(rawContent);

  if (jsonContent) {
    return parseJsonSafely(jsonContent, {
      context: "answer check response from the LLM",
      title: t("notifications.invalidLlmResponse"),
    });
  }

  return parseJsonSafely(rawContent, {
    context: "answer check response from the LLM",
    title: t("notifications.invalidLlmResponse"),
  });
}

function extractFirstJsonObject(text) {
  const startIndex = text.indexOf("{");
  if (startIndex === -1) {
    return "";
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === "\\") {
      escaped = inString;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return "";
}

function normalizeEvaluation(value) {
  const evaluation = String(value ?? "")
    .trim()
    .toLowerCase();
  return [CORRECT, MINOR, MISTAKE].includes(evaluation) ? evaluation : MISTAKE;
}

function normalizeFeedback(value) {
  return String(value ?? "").trim();
}

function buildTranslationUserPrompt(originalText, userAnswer, learnerLanguage) {
  return [
    `SENTENCE: ${originalText ?? ""}`,
    `USER_ANSWER: ${userAnswer}`,
    `LEARNER_LANGUAGE: ${learnerLanguage || "N/A"}`,
  ].join("\n");
}

function buildFillingUserPrompt(
  sentenceParts,
  expectedAnswers,
  userAnswers,
  learnerLanguage,
) {
  return [
    `SENTENCE_TEMPLATE: ${buildBlankSentenceTemplate(sentenceParts)}`,
    "EXPECTED_ANSWERS:",
    ...expectedAnswers.map((answer, index) => `${index + 1}. ${answer}`),
    "USER_ANSWERS:",
    ...userAnswers.map((answer, index) => `${index + 1}. ${answer}`),
    `LEARNER_LANGUAGE: ${learnerLanguage || "N/A"}`,
  ].join("\n");
}

function buildBlankSentenceTemplate(sentenceParts) {
  const chunks = [];

  for (let index = 0; index < sentenceParts.length; index += 1) {
    chunks.push(sentenceParts[index]);
    if (index !== sentenceParts.length - 1) {
      chunks.push(` [BLANK ${index + 1}] `);
    }
  }

  return chunks.join("");
}
