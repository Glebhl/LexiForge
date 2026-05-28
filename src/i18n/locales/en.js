const en = {
  common: {
    actions: "Actions",
    apiKey: "Extra settings",
    back: "Back",
    cards: "Cards",
    clearAll: "Clear all",
    continue: "Continue",
    copyValue: "Copy value",
    delete: "Delete",
    edit: "Edit",
    entries: "Entries",
    exportJson: "Export JSON",
    generate: "Generate",
    importJson: "Import JSON",
    key: "Key",
    off: "Off",
    on: "On",
    refresh: "Refresh",
    reset: "Reset",
    save: "Save",
    settings: "Settings",
    size: "Size",
    skip: "Skip",
    startLesson: "Start lesson",
    stop: "Stop",
    value: "Value",
    visible: "Visible",
  },
  lessonGenerators: {
    default: {
      label: "Default",
      description: "Teach new vocabulary and grammar from the current deck.",
    },
    review: {
      label: "Review",
      description: "Review previously studied vocabulary and grammar.",
    },
  },
  notifications: {
    answerCheckUnavailable: "Answer check unavailable",
    cardGenerationFailed: "Card generation failed",
    cardGenerationWarning: "Card generation warning",
    checkAnswer: "Check this answer",
    close: "Close notification",
    debug: "Debug",
    error: "Error",
    info: "Info",
    invalidJson: "Invalid JSON",
    invalidLlmResponse: "Invalid LLM response",
    notifications: "Notifications",
    skippedInvalidLlmResponse: "Skipped invalid LLM response",
    warning: "Warning",
  },
  jsonParse: {
    couldNotParse: "Could not parse {context}: {message}",
  },
  openrouter: {
    apiKeyMissing: "OpenRouter API key missing",
    addApiKey: "Add an OpenRouter API key before generating lessons.",
    missingApiKeyError:
      "OpenRouter API key is missing. Add {key} in storage.html.",
    requestFailed: "OpenRouter request failed with status {status}",
    streamError: "OpenRouter stream error",
  },
  pipeline: {
    cardsResponseMissingItems: "Cards response did not contain an items array.",
    goalsResponseMissingGoals:
      "Lesson goals response did not contain a goals array.",
    planResponseMissingSteps:
      "Lesson plan response did not contain a steps array.",
  },
  setup: {
    addLessonRequest: "Add a lesson request first.",
    couldNotGenerateCards: "Could not generate cards.",
    emptyCards: "I'm Mr. Placeholder. Look at me!",
    promptPlaceholder:
      'Topic or goal, e.g. "Second Conditional" or "Business meeting vocabulary for B2"',
    requestMissingLog: "Lesson request was not provided",
    subtitle: "Lesson planning",
    deck: {
      one: "Deck: {count} card",
      other: "Deck: {count} cards",
    },
    card: {
      edit: "Edit card",
      example: "EXAMPLE",
      grammar: "grammar",
      level: "level",
      meaning: "MEANING",
      partOfSpeech: "part of speech",
      remove: "Remove card",
      rule: "RULE",
      translation: "TRANSLATION",
      unit: "unit",
    },
    hints: {
      focused: {
        start: "Ask for a focused card deck: ",
        middle: " or ",
        end: ".",
      },
      mixed: {
        start: "Mix vocabulary and grammar when both matter: ",
        middle: " or ",
        end: ".",
      },
      situation: {
        start: "Use a real situation so examples feel usable: ",
        middle: " or ",
        end: ".",
      },
      cardType: {
        start: "Say whether you want grammar cards or vocab cards: ",
        middle: " or ",
        end: ".",
      },
      contrasts: {
        start: "Ask for contrasts when similar items blur together: ",
        middle: " or ",
        end: ".",
      },
      exactTargets: {
        start: "Paste exact targets if you already know them: ",
        middle: " or ",
        end: ".",
      },
      tone: {
        start: "Add register or tone for better card choices: ",
        middle: " or ",
        end: ".",
      },
      context: {
        start: "Ask for one word in a specific context: ",
        middle: " or ",
        end: ".",
      },
      interest: {
        start: "Shape the deck around something you actually care about: ",
        middle: " or ",
        end: ".",
      },
    },
  },
  settings: {
    additionalRequest: {
      description:
        "Optional note for tone, context, grammar focus, or extra guidance.",
      placeholder: 'Focus, e.g. "More travel examples"',
      title: "Lesson request",
    },
    exerciseTypes: {
      description: "Turn off formats you do not want in this lesson.",
      title: "Exercise types",
    },
    generator: {
      description:
        "Temporary selector for choosing the lesson generation flow.",
      title: "Generator",
    },
    groups: {
      profile: "Lesson profile",
      tuning: "Lesson tuning",
    },
    learnerLevel: {
      description: "Used for lesson pacing, explanations, and task difficulty.",
      title: "Learner level",
    },
    tasks: {
      explanation: {
        label: "Explanation",
        description: "Short teaching step without an answer field.",
      },
      matching: {
        label: "Matching",
        description: "Connect words, meanings, or pairs inside one task.",
      },
      filling: {
        label: "Fill in the blank",
        description: "Complete short sentences with guided recall.",
      },
      translation: {
        label: "Translation",
        description: "Translate short phrases or sentences into English.",
      },
      question: {
        label: "Question",
        description:
          "Read a short passage and answer a comprehension question.",
      },
    },
  },
  lesson: {
    almostThere: "Almost there",
    answer: "YOUR ANSWER",
    complete: "You've completed all exercises",
    continue: "Continue",
    emptyExplanation: "Empty",
    keyboard: "KEYBOARD",
    sentence: "SENTENCE",
    subtitle: "Lesson - Tasks",
    progress: {
      task: "Task {count}",
    },
    explanation: {
      label: "EXPLANATION",
    },
    filling: {
      answerCountMismatch: "Check that every blank has one answer.",
      answerCheckFailed: "Filling answer check failed.",
      description:
        "Build the answer using the word bank, or switch to typing if you prefer.",
      tip: "Tip: click a word to place it into the next slot, or hold and drag it into any blank. Click a placed word to remove it.",
      title: "Fill in the gaps",
    },
    loading: {
      message: "Please wait while the next exercises are being prepared.",
      title: "GENERATING",
    },
    matching: {
      description: "Click on the elements on the left and right to make pairs.",
      title: "Match the words",
    },
    mode: {
      typing: "Typing",
      wordBank: "Word Bank",
    },
    question: {
      description: "Choose an answer for the question below.",
      label: "QUESTION",
      title: "Answer the question",
    },
    translation: {
      answerCheckFailed: "Translation answer check failed.",
      description:
        "Build the answer using the word bank, or switch to typing if you prefer.",
      placeholder: "Type your translation here...",
      tip: "Tip: click to append a word, or hold and drag it into the exact position you want. Click a placed word to remove it.",
      title: "Translate the sentence",
    },
  },
  loadingScreen: {
    description: "Please wait a moment while AI generates a lesson for you.",
    errorDescription: "Check the API key and try again.",
    errorTitle: "Could not generate the lesson",
    failedTitle: "Lesson generation failed",
    openingLesson: "Opening lesson flow page",
    title: "Generating...",
    topic: "Lesson setup",
  },
  startup: {
    error: "Startup error",
    failed: "Glosium could not start.",
  },
};

export default en;
