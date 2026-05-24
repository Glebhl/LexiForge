import { OpenRouterClient } from "../../../../llm-gateway/index.js";
import { loadPrompt } from "../../../../prompts/load-prompt.js";

export const CORRECT = "correct";
export const MINOR = "minor";
export const MISTAKE = "mistake";

const DEFAULT_LANGUAGE_CODE = "en_US";
const DEFAULT_MODEL = "google/gemini-3.1-flash-lite-preview";
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
  constructor() {
    this.client = new OpenRouterClient();
    this.model = DEFAULT_MODEL;
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
      messages: [
        { role: "system", content: await this.loadPrompt(kind) },
        { role: "user", content: userPrompt },
      ],
    });
    return normalizeEvaluation(response.choices?.[0]?.message?.content);
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
