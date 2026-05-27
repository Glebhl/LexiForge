import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { ANSWER_CHECK_RESPONSE_FORMAT } from "./response-formats.js";

export const CORRECT = "correct";
export const MINOR = "minor";
export const MISTAKE = "mistake";

const DEFAULT_LANGUAGE_CODE = "en_US";
const ANSWER_CHECK_MAX_TOKENS = 32;
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
const PROMPT_PATHS = {
  filling: "en_US/answer-checking/fill_blank_check.txt",
  translation: "en_US/answer-checking/translation_check.txt",
};

let checker = null;

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

export async function evaluateTranslationAnswer(originalText, userAnswer) {
  return getChecker().evaluateTranslationAnswer(originalText, userAnswer);
}

export async function evaluateFillingAnswer(
  sentenceParts,
  expectedAnswers,
  userAnswers,
) {
  if (userAnswers.length !== expectedAnswers.length) {
    return MISTAKE;
  }

  return getChecker().evaluateFillingAnswer(
    sentenceParts,
    expectedAnswers,
    userAnswers,
  );
}

function getChecker() {
  checker ??= new AnswerChecker();
  return checker;
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
  constructor(options = {}) {
    this.client = new OpenRouterClient(options);
    this.model = resolvePipelineModel("answerChecking", options.model);
    this.prompts = {};
  }

  async evaluateTranslationAnswer(originalText, userAnswer) {
    return this.generateEvaluation(
      "translation",
      buildTranslationUserPrompt(originalText, userAnswer),
    );
  }

  async evaluateFillingAnswer(sentenceParts, expectedAnswers, userAnswers) {
    return this.generateEvaluation(
      "filling",
      buildFillingUserPrompt(sentenceParts, expectedAnswers, userAnswers),
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
    const parsedContent = parseJsonSafely(content, {
      context: "answer check response from the LLM",
      title: "Invalid LLM response",
    });

    return normalizeEvaluation(parsedContent?.evaluation);
  }

  async loadPrompt(kind) {
    if (this.prompts[kind]) {
      return this.prompts[kind];
    }

    this.prompts[kind] = await loadPrompt(PROMPT_PATHS[kind]);
    return this.prompts[kind];
  }
}

function normalizeEvaluation(value) {
  const evaluation = String(value ?? "")
    .trim()
    .toLowerCase();
  return [CORRECT, MINOR, MISTAKE].includes(evaluation) ? evaluation : MISTAKE;
}

function buildTranslationUserPrompt(originalText, userAnswer) {
  return [`SENTENCE: ${originalText ?? ""}`, `USER_ANSWER: ${userAnswer}`].join(
    "\n",
  );
}

function buildFillingUserPrompt(sentenceParts, expectedAnswers, userAnswers) {
  return [
    `SENTENCE_TEMPLATE: ${buildBlankSentenceTemplate(sentenceParts)}`,
    "EXPECTED_ANSWERS:",
    ...expectedAnswers.map((answer, index) => `${index + 1}. ${answer}`),
    "USER_ANSWERS:",
    ...userAnswers.map((answer, index) => `${index + 1}. ${answer}`),
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
