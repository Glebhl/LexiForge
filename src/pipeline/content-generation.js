import { OpenRouterClient } from "../llm_gateway/index.js";
import { CONTENT_STUBS, STUB_FLAGS } from "./stubs.js";

const PROMPT_FILES = {
  question: "reading_mcq_generate.txt",
  explanation: "explanation_generate.txt",
  filling: "fill_blank_generate.txt",
  translation: "translation_generate.txt",
  matching: "matching_generate.txt",
};

export class ContentGenerator {
  constructor(lessonSettings, options = {}) {
    this.lessonSettings = lessonSettings;
    this.model = options.model || "google/gemini-3-flash-preview";
    this.client = new OpenRouterClient(options);
    this.prompts = {};
  }

  static async create(lessonSettings, options = {}) {
    const contentGenerator = new ContentGenerator(lessonSettings, options);
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
      `../prompts/${this.lessonSettings.lessonLanguage}/task-generation/${promptFile}`,
      import.meta.url,
    );
    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error(
        `Could not load prompt from ${promptPath}. Status: ${response.status}`,
      );
    }

    console.debug("Loaded content generator prompt");
    this.prompts[exercise_id] = await response.text();
  }

  async generate({ description, exercise_id }) {
    console.info("Generating lesson content.", { exercise_id, description });
    const userPrompt = this.buildUserPrompt({ description });
    console.debug(`User prompt:\n${userPrompt}`);

    let content;

    if (STUB_FLAGS.content) {
      console.debug("ContentGenerator: using stub instead of LLM call", {
        exercise_id,
      });
      content = CONTENT_STUBS[exercise_id];

      if (!content) {
        throw new Error(`No content stub for exercise_id: ${exercise_id}`);
      }
    } else {
      const response = await this.client.chat({
        model: this.model,
        messages: [
          { role: "system", content: this.prompts[exercise_id] },
          { role: "user", content: userPrompt },
        ],
      });
      content = response.choices?.[0]?.message?.content || "";
    }

    if (exercise_id === "explanation") {
      return content;
    }

    console.debug(`Task content:\n${content}`);
    return JSON.parse(content);
  }

  buildUserPrompt({ description }) {
    const lines = [];
    description &&
      lines.push(`DESCRIPTION:\n${description}`);
    this.lessonSettings.learnerLanguage &&
      lines.push(`LEARNER_LANGUAGE: ${this.lessonSettings.learnerLanguage}`);
    this.lessonSettings.learnerLevel &&
      lines.push(`LEARNER_LEVEL: ${this.lessonSettings.learnerLevel}`);
    return lines.join("\n");
  }
}
