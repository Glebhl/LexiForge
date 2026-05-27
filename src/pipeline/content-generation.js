import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { CONTENT_RESPONSE_FORMATS } from "./response-formats.js";
import { CONTENT_STUBS, STUB_FLAGS } from "./stubs.js";

const PROMPT_FILES = {
  question: "reading_mcq_generate.txt",
  explanation: "explanation_generate.txt",
  filling: "fill_blank_generate.txt",
  translation: "translation_generate.txt",
  matching: "matching_generate.txt",
};
const CONTENT_MAX_TOKENS = 2048;
const CONTENT_REASONIG_EFFORT = "minimal";

export class ContentGenerator {
  constructor(lessonSettings, options = {}) {
    this.lessonSettings = lessonSettings;
    this.model = resolvePipelineModel("content", options.model);
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

    console.debug("Loaded content generator prompt");
    this.prompts[exercise_id] = await loadPrompt(
      `${this.lessonSettings.lessonLanguage}/task-generation/${promptFile}`,
    );
  }

  async generate({ description, exercise_id, mode }) {
    console.info("Generating lesson content.", {
      exercise_id,
      mode,
      description,
    });
    const userPrompt = this.buildUserPrompt({ description, mode });
    console.debug(`User prompt:\n${userPrompt}`);

    let content;
    const isStub = STUB_FLAGS.content;

    if (isStub) {
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
        max_tokens: CONTENT_MAX_TOKENS,
        response_format: CONTENT_RESPONSE_FORMATS[exercise_id],
        messages: [
          { role: "system", content: this.prompts[exercise_id] },
          { role: "user", content: userPrompt },
        ],
        reasoning: {
          effort: CONTENT_REASONIG_EFFORT,
        },
      });
      content = response.choices?.[0]?.message?.content || "";
    }

    if (isStub && exercise_id === "explanation") {
      return content;
    }

    console.debug(`Task content:\n${content}`);
    const parsedContent = parseJsonSafely(content, {
      context: `${exercise_id} task response from the LLM`,
      title: "Invalid LLM response",
    });

    if (exercise_id === "explanation") {
      return parsedContent.html || "";
    }

    return parsedContent;
  }

  buildUserPrompt({ description, mode }) {
    const lines = [];
    description && lines.push(`DESCRIPTION:\n${description}`);
    mode && lines.push(`MODE: ${mode}`);
    this.lessonSettings.learnerLanguage &&
      lines.push(`LEARNER_LANGUAGE: ${this.lessonSettings.learnerLanguage}`);
    this.lessonSettings.learnerLevel &&
      lines.push(`LEARNER_LEVEL: ${this.lessonSettings.learnerLevel}`);
    return lines.join("\n");
  }
}
