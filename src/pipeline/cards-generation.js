import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
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

    let buffer = "";

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
      buffer += token;
    }

    for (const item of parseCardsResponse(buffer)) {
      yield JSON.stringify(item);
    }
  }

  buildUserPrompt({ learnerRequest, learnerLanguage }) {
    const lines = [];
    lines.push(`LEARNER_REQUEST: ${learnerRequest}`);
    lines.push(`LEARNER_LANGUAGE: ${learnerLanguage}`);
    return lines.join("\n");
  }
}

function parseCardsResponse(content) {
  const parsedContent = parseJsonSafely(content, {
    context: "cards response from the LLM",
    title: "Invalid LLM response",
  });

  if (!Array.isArray(parsedContent?.items)) {
    throw new Error("Cards response did not contain an items array.");
  }

  return parsedContent.items;
}
