import { OpenRouterClient } from "../llm_gateway/index.js";

export class GoalsGenerator {
  constructor(lessonLanguage, options = {}) {
    this.lessonLanguage = lessonLanguage;
    this.model = options.model || "google/gemini-3-flash-preview";
    this.client = new OpenRouterClient(options);
    this.prompt = "";
  }

  static async create(lessonLanguage, options = {}) {
    const goalsGenerator = new GoalsGenerator(lessonLanguage, options);
    await goalsGenerator.loadPrompt();
    return goalsGenerator;
  }

  async loadPrompt() {
    const promptPath = new URL(
      `../prompts/${this.lessonLanguage}/lesson/goals_generate.txt`,
      import.meta.url,
    );
    const response = await fetch(promptPath);

    if (!response.ok) {
      throw new Error(`Could not load prompt from ${promptPath}. Status: ${response.status}`);
    }
    console.debug("Loaded goals generator prompt");

    this.prompt = await response.text();
  }

  async generate(lessonSettings) {
    console.info("Generating lesson goals.", {lessonSettings});
    const userPrompt = this.buildUserPrompt(lessonSettings);
    console.debug("User prompt:\n", userPrompt);
    
    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: "system", content: this.prompt },
        { role: "user", content: userPrompt },
      ],
    });
    return JSON.parse(response.choices?.[0]?.message?.content || "");
  }

  buildUserPrompt(lessonSettings) {
    const lines = []
    lessonSettings.lessonLanguage && lines.push(`LESSON_LANGUAGE: ${lessonSettings.lessonLanguage}`);
    lessonSettings.learnerLanguage && lines.push(`LEARNER_LANGUAGE: ${lessonSettings.learnerLanguage}`);
    lessonSettings.learnerLevel && lines.push(`LEARNER_LEVEL: ${lessonSettings.learnerLevel}`);
    lessonSettings.learnerRequest && lines.push(`LEARNER_REQUEST: ${lessonSettings.learnerRequest}`);
    lessonSettings.cards && lines.push(`TARGETS:\n${lessonSettings.cards}`);
    return lines.join("\n");
  }
}
