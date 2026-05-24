// Debug stubs for pipeline generators.
// Flip a flag to skip the corresponding LLM call and feed the parser
// the raw text below as if it were the model's response.

export const STUB_FLAGS = {
  cards: false,
  goals: false,
  plan: false,
  content: false,
};

// JSONL: one generated card per line.
export const CARDS_STUB = `{"type":"vocab","lexeme":"inevitable","lexical_unit":"word","part_of_speech":"adjective","level":"B2","transcription":"/æmˈbɪɡjuəs/","translation":"неизбежный","definition":"то, чего нельзя избежать","definition_english":"something that cannot be avoided","example":"It was an inevitable consequence of his actions."}
{"type":"vocab","lexeme":"subtle","lexical_unit":"word","part_of_speech":"adjective","level":"B2","transcription":"/æmˈbɪɡjuəs/","translation":"тонкий, едва заметный","definition":"неявный или трудноуловимый","definition_english":"implicit or elusive","example":"There is a subtle difference between these two shades of blue."}
{"type":"vocab","lexeme":"mitigate","lexical_unit":"word","part_of_speech":"verb","level":"B2","transcription":"/æmˈbɪɡjuəs/","translation":"смягчать, уменьшать","definition":"делать что-то менее серьезным или суровым","definition_english":"make something less serious or severe","example":"The government is trying to mitigate the effects of the crisis."}
{"type":"vocab","lexeme":"ambiguous","lexical_unit":"word","part_of_speech":"adjective","level":"B2","transcription":"/æmˈbɪɡjuəs/","translation":"двусмысленный","definition":"имеющий несколько возможных значений","definition_english":"having several possible meanings","example":"The ending of the movie was ambiguous and left us with many questions."}
{"type":"grammar","grammar":"Present Perfect for life experience","level":"B1","rule":"используется, чтобы говорить об опыте без указания точного времени в прошлом","example":"I have visited London twice."}
{"type":"grammar","grammar":"Used to for past habits","level":"B1","rule":"используется для привычек или состояний в прошлом, которые сейчас уже не актуальны","example":"She used to live near the station."}
`;

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
  "answer": "Some advice and one tip",
  "distractors": ["A ticket and a map", "Two interviews", "A new job"]
}`,
  translation: `{
  "paragraph": "I need some advice before the exam.",
  "sentence": "I need some advice before the exam.",
  "answers": ["I need some advice before the exam."],
  "distractors": ["an", "advices", "after"]
}`,
};
