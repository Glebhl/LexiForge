import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { GOALS_RESPONSE_FORMAT } from "./response-formats.js";
import { GOALS_STUB, STUB_FLAGS } from "./stubs.js";

const GOALS_MAX_TOKENS = 1024;
const GOALS_REASONIG_EFFORT = "minimal";

export class GoalsGenerator {
  constructor(lessonLanguage, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.promptPath =
      options.promptPath || "lesson/generators/default/goals_generate.txt";
    this.model = resolvePipelineModel("goals", options.model);
    this.client = new OpenRouterClient(options);
    this.prompt = "";
  }

  static async create(lessonLanguage, options = {}) {
    const goalsGenerator = new GoalsGenerator(lessonLanguage, options);
    await goalsGenerator.loadPrompt();
    return goalsGenerator;
  }

  async loadPrompt() {
    this.prompt = await loadPrompt(`${this.lessonLanguage}/${this.promptPath}`);
    console.debug("Loaded goals generator prompt");
  }

  async generate(lessonSettings) {
    console.info("Generating lesson goals.", { lessonSettings });
    const userPrompt = this.buildUserPrompt(lessonSettings);
    console.debug("User prompt:\n", userPrompt);

    let content;

    if (STUB_FLAGS.goals) {
      console.debug("GoalsGenerator: using stub instead of LLM call");
      content = GOALS_STUB;
    } else {
      const response = await this.client.chat({
        model: this.model,
        max_tokens: GOALS_MAX_TOKENS,
        response_format: GOALS_RESPONSE_FORMAT,
        messages: [
          { role: "system", content: this.prompt },
          { role: "user", content: userPrompt },
        ],
        reasoning: {
          effort: GOALS_REASONIG_EFFORT,
        },
      });
      content = response.choices?.[0]?.message?.content || "";
    }

    const parsedContent = parseJsonSafely(content, {
      context: "lesson goals response from the LLM",
      title: "Invalid LLM response",
    });

    console.log(parsedContent);

    if (Array.isArray(parsedContent)) {
      return parsedContent;
    }

    if (Array.isArray(parsedContent?.goals)) {
      return parsedContent.goals;
    }

    throw new Error("Lesson goals response did not contain a goals array.");
  }

  buildUserPrompt(lessonSettings) {
    const lines = [];
    lessonSettings.learnerLanguage &&
      lines.push(`LEARNER_LANGUAGE: ${lessonSettings.learnerLanguage}`);
    lessonSettings.learnerLevel &&
      lines.push(`LEARNER_LEVEL: ${lessonSettings.learnerLevel}`);
    lessonSettings.learnerRequest &&
      lines.push(`LEARNER_REQUEST: ${lessonSettings.learnerRequest}`);
    lessonSettings.cards &&
      lines.push(`LEARNING_UNITS:\n${lessonSettings.cards}`);
    return lines.join("\n");
  }
}
