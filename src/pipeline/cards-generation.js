import { OpenRouterClient } from "../llm_gateway/index.js";

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
    const promptPath = new URL(
      `../prompts/${this.lessonLanguage}/cards/cards_generate.txt`,
      import.meta.url,
    );
    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error(
        `Could not load prompt from ${promptPath}. Status: ${response.status}`,
      );
    }

    console.debug("Loaded cards generator prompt");
    this.prompt = await response.text();
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
