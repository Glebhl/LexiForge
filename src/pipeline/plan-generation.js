import { OpenRouterClient } from "../llm_gateway/index.js";
import { PLAN_STUB, STUB_FLAGS } from "./stubs.js";

export class PlanGenerator {
  constructor(lessonLanguage, stageId, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.stageId = stageId;
    this.model = options.model || "google/gemini-3-flash-preview";
    this.client = new OpenRouterClient(options);
    this.prompt = "";
  }

  static async create(lessonLanguage, stageId, options = {}) {
    const planGenerator = new PlanGenerator(lessonLanguage, stageId, options);
    await planGenerator.loadPrompt();
    return planGenerator;
  }

  async loadPrompt() {
    const promptPath = new URL(
      `../prompts/${this.lessonLanguage}/lesson/stages/${this.stageId}_plan.txt`,
      import.meta.url,
    );
    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error(
        `Could not load prompt from ${promptPath}. Status: ${response.status}`,
      );
    }

    console.debug("Loaded plan generator prompt");
    this.prompt = await response.text();
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
          yield JSON.parse(line.trim());
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
        if (line.trim()) {
          yield JSON.parse(line.trim());
        }
      }
    }

    if (buffer.trim()) {
      yield JSON.parse(buffer.trim());
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
      lines.push(`DISABLED_EXERCISES: ${lessonSettings.disabledExercises}`);
    lessonSettings.cards &&
      lines.push(`LEARNING_UNITS:\n${lessonSettings.cards}`);
    lessonSettings.goals &&
      lines.push(`LESSON_GOALS:\n${lessonSettings.goals}`);
    // lessonSettings.previousStageResults && lines.push(`PREVIOUS_STAGE_RESULTS:\n${this.formatPromptValue(lessonSettings.previousStageResults)}`);
    return lines.join("\n");
  }
}
