import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { CARDS_STUB, STUB_FLAGS } from "./stubs.js";

export class CardsGenerator {
  constructor(lessonLanguage, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.model = options.model || "google/gemini-3.1-flash-lite-preview";
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
      messages: [
        { role: "system", content: this.prompt },
        { role: "user", content: userPrompt },
      ],
    })) {
      const token = chunk.choices?.[0]?.delta?.content || "";
      buffer += token;
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine) {
          yield trimmedLine;
        }
      }
    }

    if (buffer.trim()) {
      yield buffer.trim();
    }
  }

  buildUserPrompt({ learnerRequest, learnerLanguage }) {
    const lines = [];
    lines.push(`LEARNER_REQUEST: ${learnerRequest}`);
    lines.push(`LEARNER_LANGUAGE: ${learnerLanguage}`);
    return lines.join("\n");
  }
}
