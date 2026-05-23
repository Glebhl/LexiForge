// Debug stubs for pipeline generators.
// Flip a flag to skip the corresponding LLM call and feed the parser
// the raw text below as if it were the model's response.

export const STUB_FLAGS = {
  goals: false,
  plan: false,
  content: false,
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
{"description":"Units: U1 'advice' = uncountable noun. Task: read a short passage and choose what the teacher gave Mira.","exercise_id":"question","mode":"none"}
{"description":"Units: U1 'advice' = uncountable noun. Task: translate one short learner-language sentence into English using 'some advice'.","exercise_id":"translation","mode":"word-bank"}
`;

export const CONTENT_STUBS = {
  matching: `{
  "pairs": [
    ["advice", "counsel or guidance"],
    ["tip", "a small useful suggestion"],
    ["make a decision", "choose what to do"]
  ]
}`,
  explanation: `<h2>Advice is uncountable</h2>
<p><strong>Advice</strong> means help or guidance, but we do not count it as one separate object.</p>
<ul>
  <li>Use: <em>some advice</em>, <em>a piece of advice</em></li>
  <li>Do not use: <em>an advice</em>, <em>advices</em></li>
</ul>
<p>Example: <em>She gave me some useful advice.</em></p>`,
  filling: `{
  "paragraph": "Before the interview, Mira asked her teacher for some [advice]. The teacher gave her one useful [tip]: speak slowly.",
  "distractors": ["advices", "decision", "ticket"]
}`,
  question: `{
  "passage": "Mira wanted to improve her English before a job interview. Her teacher gave her some advice and one practical tip. The advice was to speak clearly. The tip was to write three key sentences before the interview.",
  "question": "What did Mira's teacher give her?",
  "options": ["Some advice and one tip", "A ticket and a map", "Two interviews", "A new job"],
  "answer": 0
}`,
  translation: `{
  "paragraph": "I need some advice before the exam.",
  "sentence": "I need some advice before the exam.",
  "answers": ["I need some advice before the exam."],
  "distractors": ["an", "advices", "after"]
}`,
};
