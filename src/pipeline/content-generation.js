import { OpenRouterClient } from "../llm_gateway/index.js";

const PROMPT_FILES = {
  question: "reading_mcq_generate.txt",
  explanation: "explanation_generate.txt",
  filling: "fill_blank_generate.txt",
  translation: "translation_generate.txt",
  matching: "matching_generate.txt",
};

export class ContentGenerator {
  constructor(lessonLanguage, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.model = options.model || "google/gemini-3-flash-preview";
    this.client = new OpenRouterClient(options);
    this.prompts = {};
  }

  static async create(lessonLanguage, options = {}) {
    const contentGenerator = new ContentGenerator(lessonLanguage, options);
    await contentGenerator.loadPrompts();
    return contentGenerator;
  }

  async loadPrompts() {
    for (const exercise_id of Object.keys(PROMPT_FILES)) {
      await this.loadPrompt(exercise_id);
    }
  }

  async loadPrompt(exercise_id) {
    const promptFile = PROMPT_FILES[exercise_id];

    if (!promptFile) {
      throw new Error(`Unknown exercise_id: ${exercise_id}`);
    }

    const promptPath = new URL(
      `../prompts/${this.lessonLanguage}/task-generation/${promptFile}`,
      import.meta.url,
    );
    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error(`Could not load prompt from ${promptPath}. Status: ${response.status}`);
    }
    console.debug("Loaded content generator prompt");

    this.prompts[exercise_id] = await response.text();
  }

  async generate({ description, exercise_id }) {
    console.info("Generating lesson content.", { exercise_id, description });

    const userPrompt = this.buildUserPrompt({ description });
    console.debug("User prompt:\n", userPrompt);

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: "system", content: this.prompts[exercise_id] },
        { role: "user", content: userPrompt },
      ],
    });
    const content = response.choices?.[0]?.message?.content || "";

    if (exercise_id === "explanation") {
      return content;
    }
    return JSON.parse(content);
  }

  buildUserPrompt({ description }) {
    const lines = []
    description && lines.push(`DESCRIPTION:\n${description}`);
    return lines.join("\n");
  }
}
