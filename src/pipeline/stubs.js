// Debug stubs for pipeline generators.
// Flip a flag to skip the corresponding LLM call and feed the parser
// the raw text below as if it were the model's response.

export const STUB_FLAGS = {
  goals: true,
  plan: true,
};

export const GOALS_STUB = `[
  "Present 'advice' as an uncountable noun and show article restrictions",
  "Contrast 'make' vs 'do' in fixed collocations",
  "Explain the difference between 'in', 'on', 'at' for time references"
]`;

// JSONL: one exercise per line. Used by PlanGenerator regardless of stageId.
export const PLAN_STUB = `{"description":"Units: U1 'advice' = совет, uncountable noun; U2 'tip' = совет/подсказка, countable. Task: match English words to Russian translations. Constraints: distinct labels, no duplicates.","exercise_id":"matching","mode":"none"}
{"description":"Units: U1 'advice' = uncountable noun meaning совет. Task: short explanation of why 'advice' takes no article and no plural form, with one example.","exercise_id":"explanation","mode":"none"}
{"description":"Units: U1 'advice' = совет, uncountable. Task: 2 short English sentences with a blank for 'advice'; learner picks from a word bank. Constraints: no plural, no 'an advice'.","exercise_id":"filling","mode":"word-bank"}
`;
