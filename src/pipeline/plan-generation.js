import { OpenRouterClient } from "../llm-gateway/index.js";
import { loadPrompt } from "../prompts/load-prompt.js";
import { resolvePipelineModel } from "../storage/index.js";
import { parseJsonSafely } from "../ui/json-parse.js";
import { PLAN_STUB, STUB_FLAGS } from "./stubs.js";

const PLAN_MAX_TOKENS = 2048;

export class PlanGenerator {
  constructor(lessonLanguage, stageId, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.stageId = stageId;
    this.promptDirectory =
      options.promptDirectory || "lesson/generators/default/stages";
    this.model = resolvePipelineModel("plan", options.model);
    this.client = new OpenRouterClient(options);
    this.prompt = "";
  }

  static async create(lessonLanguage, stageId, options = {}) {
    const planGenerator = new PlanGenerator(lessonLanguage, stageId, options);
    await planGenerator.loadPrompt();
    return planGenerator;
  }

  async loadPrompt() {
    console.debug("Loaded plan generator prompt");
    this.prompt = await loadPrompt(
      `${this.lessonLanguage}/${this.promptDirectory}/${this.stageId}_plan.txt`,
    );
  }

  async *generate(lessonSettings) {
    console.info("Generating lesson plan.", {
      stageId: this.stageId,
      lessonSettings,
    });
    const userPrompt = this.buildUserPrompt(lessonSettings);
    console.debug("User prompt:\n", userPrompt);

    yield* this.streamPlan({ userPrompt });
  }

  async *streamPlan({ userPrompt }) {
    if (STUB_FLAGS.plan) {
      console.debug("PlanGenerator: using stub instead of LLM call");

      for (const line of PLAN_STUB.split("\n")) {
        if (line.trim()) {
          const item = parsePlanLine(line);

          if (item) {
            yield item;
          }
        }
      }

      return;
    }

    let buffer = "";

    for await (const chunk of this.client.streamChat({
      model: this.model,
      max_tokens: PLAN_MAX_TOKENS,
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
        if (line.trim()) {
          const item = parsePlanLine(line);

          if (item) {
            yield item;
          }
        }
      }
    }

    if (buffer.trim()) {
      const item = parsePlanLine(buffer);

      if (item) {
        yield item;
      }
    }
  }

  buildUserPrompt(lessonSettings) {
    const lines = [];
    lessonSettings.lessonLanguage &&
      lines.push(`LESSON_LANGUAGE: ${lessonSettings.lessonLanguage}`);
    lessonSettings.learnerLanguage &&
      lines.push(`LEARNER_LANGUAGE: ${lessonSettings.learnerLanguage}`);
    lessonSettings.learnerLevel &&
      lines.push(`LEARNER_LEVEL: ${lessonSettings.learnerLevel}`);
    lessonSettings.learnerRequest &&
      lines.push(`LEARNER_REQUEST: ${lessonSettings.learnerRequest}`);
    lessonSettings.disabledExercises?.length &&
      lines.push(
        `DISABLED_EXERCISES: ${JSON.stringify(lessonSettings.disabledExercises)}`,
      );
    lessonSettings.cards &&
      lines.push(`LEARNING_UNITS:\n${lessonSettings.cards}`);
    lessonSettings.goals &&
      lines.push(`LESSON_GOALS:\n${JSON.stringify(lessonSettings.goals)}`);
    // lessonSettings.previousStageResults && lines.push(`PREVIOUS_STAGE_RESULTS:\n${this.formatPromptValue(lessonSettings.previousStageResults)}`);
    return lines.join("\n");
  }
}

function parsePlanLine(line) {
  return parseJsonSafely(line.trim(), {
    context: "lesson plan line from the LLM",
    fallback: null,
    level: "warning",
    throwOnError: false,
    title: "Skipped invalid LLM response",
  });
}
