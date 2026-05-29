import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { t } from "../i18n/index.js";
import { CARDS_RESPONSE_FORMAT } from "./response-formats.js";
import { CARDS_STUB, STUB_FLAGS } from "./stubs.js";

const CARDS_MAX_TOKENS = 2048;
const CARDS_REASONIG_EFFORT = "minimal";

export class CardsGenerator {
  constructor(lessonLanguage, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.model = resolvePipelineModel("cards", options.model);
    this.client = new OpenRouterClient(options);
    this.prompt = "";
  }

  static async create(lessonLanguage, options = {}) {
    const cardsGenerator = new CardsGenerator(lessonLanguage, options);
    await cardsGenerator.loadPrompt();
    return cardsGenerator;
  }

  async loadPrompt() {
    console.debug("Loaded cards generator prompt");
    this.prompt = await loadPrompt(
      `${this.lessonLanguage}/cards/cards_generate.txt`,
    );
  }

  async *generate({ learnerRequest, learnerLanguage }) {
    console.info(
      `Generating cards. learnerRequest=${learnerRequest} learnerLanguage=${learnerLanguage}`,
    );
    const userPrompt = this.buildUserPrompt({
      learnerRequest,
      learnerLanguage,
    });
    yield* this.streamCards({ userPrompt });
  }

  async *streamCards({ userPrompt }) {
    if (STUB_FLAGS.cards) {
      console.debug("CardsGenerator: using stub instead of LLM call");

      for (const line of CARDS_STUB.split("\n")) {
        const trimmedLine = line.trim();

        if (trimmedLine) {
          yield trimmedLine;
        }
      }

      return;
    }

    const parser = createCardsStreamParser();

    for await (const chunk of this.client.streamChat({
      model: this.model,
      max_tokens: CARDS_MAX_TOKENS,
      response_format: CARDS_RESPONSE_FORMAT,
      messages: [
        { role: "system", content: this.prompt },
        { role: "user", content: userPrompt },
      ],
      reasoning: {
        effort: CARDS_REASONIG_EFFORT,
      },
    })) {
      const token = chunk.choices?.[0]?.delta?.content || "";

      for (const item of parser.push(token)) {
        yield item;
      }
    }

    for (const item of parser.flush()) {
      yield item;
    }
  }

  buildUserPrompt({ learnerRequest, learnerLanguage }) {
    const lines = [];
    lines.push(`LEARNER_REQUEST: ${learnerRequest}`);
    lines.push(`LEARNER_LANGUAGE: ${learnerLanguage}`);
    return lines.join("\n");
  }
}

function createCardsStreamParser() {
  let objectBuffer = "";
  let objectDepth = 0;
  let isInsideString = false;
  let isEscaped = false;

  function push(text) {
    const items = [];

    for (const char of text) {
      if (objectDepth === 0) {
        if (char === "{") {
          objectBuffer = char;
          objectDepth = 1;
        }

        continue;
      }

      objectBuffer += char;

      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = isInsideString;
        continue;
      }

      if (char === '"') {
        isInsideString = !isInsideString;
        continue;
      }

      if (isInsideString) {
        continue;
      }

      if (char === "{") {
        objectDepth += 1;
        continue;
      }

      if (char === "}") {
        objectDepth -= 1;

        if (objectDepth === 0) {
          const item = parseJsonSafely(objectBuffer, {
            context: "card object from the LLM stream",
            title: t("notifications.skippedInvalidLlmResponse"),
          });
          items.push(JSON.stringify(item));
          objectBuffer = "";
          isInsideString = false;
          isEscaped = false;
        }
      }
    }

    return items;
  }

  function flush() {
    return [];
  }

  return { flush, push };
}
