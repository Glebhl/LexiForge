const ru = {
  common: {
    actions: "Действия",
    apiKey: "Доп. настройки",
    back: "Назад",
    cards: "Карточки",
    clearAll: "Очистить все",
    continue: "Продолжить",
    copyValue: "Скопировать значение",
    delete: "Удалить",
    edit: "Изменить",
    entries: "Записи",
    exportJson: "Экспорт JSON",
    generate: "Сгенерировать",
    importJson: "Импорт JSON",
    key: "Ключ",
    off: "Выкл",
    on: "Вкл",
    refresh: "Обновить",
    reset: "Сбросить",
    save: "Сохранить",
    settings: "Настройки",
    size: "Размер",
    skip: "Пропустить",
    startLesson: "Начать урок",
    stop: "Остановить",
    value: "Значение",
    visible: "Видимые",
  },
  lessonGenerators: {
    default: {
      label: "Обычный",
      description: "Учит новой лексике и грамматике из текущей колоды.",
    },
    review: {
      label: "Повторение",
      description: "Повторяет уже изученную лексику и грамматику.",
    },
  },
  notifications: {
    answerCheckUnavailable: "Проверка ответа недоступна",
    cardGenerationFailed: "Не удалось сгенерировать карточки",
    cardGenerationWarning: "Предупреждение генерации карточек",
    checkAnswer: "Проверьте ответ",
    close: "Закрыть уведомление",
    debug: "Отладка",
    error: "Ошибка",
    info: "Информация",
    invalidJson: "Некорректный JSON",
    invalidLlmResponse: "Некорректный ответ LLM",
    notifications: "Уведомления",
    skippedInvalidLlmResponse: "Некорректный ответ LLM пропущен",
    warning: "Предупреждение",
  },
  jsonParse: {
    couldNotParse: "Не удалось разобрать {context}: {message}",
  },
  openrouter: {
    apiKeyMissing: "Не указан API-ключ OpenRouter",
    addApiKey: "Добавьте API-ключ OpenRouter перед генерацией уроков.",
    missingApiKeyError:
      "Не указан API-ключ OpenRouter. Добавьте {key} в storage.html.",
    requestFailed: "Запрос OpenRouter завершился ошибкой со статусом {status}",
    streamError: "Ошибка потока OpenRouter",
  },
  pipeline: {
    cardsResponseMissingItems: "Ответ с карточками не содержит массив items.",
    goalsResponseMissingGoals: "Ответ с целями урока не содержит массив goals.",
    planResponseMissingSteps: "Ответ с планом урока не содержит массив steps.",
  },
  setup: {
    addLessonRequest: "Сначала добавьте запрос для урока.",
    couldNotGenerateCards: "Не удалось сгенерировать карточки.",
    emptyCards: "Здесь появятся сгенерированные карточки.",
    promptPlaceholder:
      'Тема или цель, например "Second Conditional" или "лексика деловой встречи для B2"',
    requestMissingLog: "Запрос для урока не указан",
    subtitle: "Планирование урока",
    deck: {
      one: "Колода: {count} карточка",
      few: "Колода: {count} карточки",
      many: "Колода: {count} карточек",
      other: "Колода: {count} карточки",
    },
    card: {
      edit: "Изменить карточку",
      example: "ПРИМЕР",
      grammar: "грамматика",
      level: "уровень",
      meaning: "ЗНАЧЕНИЕ",
      partOfSpeech: "часть речи",
      remove: "Удалить карточку",
      rule: "ПРАВИЛО",
      translation: "ПЕРЕВОД",
      unit: "раздел",
    },
    hints: {
      focused: {
        start: "Попросите сфокусированную колоду: ",
        middle: " или ",
        end: ".",
      },
      mixed: {
        start: "Смешайте лексику и грамматику, если важны обе темы: ",
        middle: " или ",
        end: ".",
      },
      situation: {
        start: "Добавьте реальную ситуацию, чтобы примеры были полезнее: ",
        middle: " или ",
        end: ".",
      },
      cardType: {
        start: "Уточните, нужны грамматические или словарные карточки: ",
        middle: " или ",
        end: ".",
      },
      contrasts: {
        start: "Попросите сравнить похожие элементы: ",
        middle: " или ",
        end: ".",
      },
      exactTargets: {
        start: "Вставьте конкретные цели, если уже знаете их: ",
        middle: " или ",
        end: ".",
      },
      tone: {
        start: "Добавьте регистр или тон для более точного выбора карточек: ",
        middle: " или ",
        end: ".",
      },
      context: {
        start: "Попросите одно слово в конкретном контексте: ",
        middle: " или ",
        end: ".",
      },
      interest: {
        start: "Свяжите колоду с тем, что вам действительно интересно: ",
        middle: " или ",
        end: ".",
      },
    },
  },
  settings: {
    additionalRequest: {
      description:
        "Необязательная заметка о тоне, контексте, грамматике или дополнительных пожеланиях.",
      placeholder: 'Фокус, например "Больше примеров про путешествия"',
      title: "Запрос для урока",
    },
    exerciseTypes: {
      description: "Отключите форматы, которые не нужны в этом уроке.",
      title: "Типы упражнений",
    },
    generator: {
      description: "Временный выбор сценария генерации урока.",
      title: "Генератор",
    },
    groups: {
      profile: "Профиль урока",
      tuning: "Настройка урока",
    },
    learnerLevel: {
      description: "Используется для темпа урока, объяснений и сложности.",
      title: "Уровень ученика",
    },
    tasks: {
      explanation: {
        label: "Объяснение",
        description: "Короткий обучающий шаг без поля ответа.",
      },
      matching: {
        label: "Сопоставление",
        description: "Соединение слов, значений или пар в одном задании.",
      },
      filling: {
        label: "Пропуски",
        description: "Заполнение коротких предложений с подсказками.",
      },
      translation: {
        label: "Перевод",
        description: "Перевод коротких фраз или предложений на английский.",
      },
      question: {
        label: "Вопрос",
        description: "Чтение короткого текста и ответ на вопрос по нему.",
      },
    },
  },
  lesson: {
    almostThere: "Почти получилось",
    answer: "ВАШ ОТВЕТ",
    complete: "Вы выполнили все упражнения",
    continue: "Продолжить",
    emptyExplanation: "Пусто",
    keyboard: "КЛАВИАТУРА",
    sentence: "ПРЕДЛОЖЕНИЕ",
    subtitle: "Урок - задания",
    progress: {
      task: "Задание {count}",
    },
    explanation: {
      label: "ОБЪЯСНЕНИЕ",
    },
    filling: {
      answerCountMismatch: "Проверьте, что каждый пропуск заполнен.",
      answerCheckFailed: "Не удалось проверить ответ с пропусками.",
      description:
        "Соберите ответ из банка слов или переключитесь на ввод с клавиатуры.",
      tip: "Подсказка: нажмите на слово, чтобы поставить его в следующий пропуск, или удерживайте и перетащите в любой пропуск. Нажмите на поставленное слово, чтобы убрать его.",
      title: "Заполните пропуски",
    },
    loading: {
      message: "Подождите, пока готовятся следующие упражнения.",
      title: "ГЕНЕРАЦИЯ",
    },
    matching: {
      description:
        "Нажимайте на элементы слева и справа, чтобы составить пары.",
      title: "Сопоставьте слова",
    },
    mode: {
      typing: "Ввод",
      wordBank: "Банк слов",
    },
    question: {
      description: "Выберите ответ на вопрос ниже.",
      label: "ВОПРОС",
      title: "Ответьте на вопрос",
    },
    translation: {
      answerCheckFailed: "Не удалось проверить перевод.",
      description:
        "Соберите ответ из банка слов или переключитесь на ввод с клавиатуры.",
      placeholder: "Введите перевод здесь...",
      tip: "Подсказка: нажмите, чтобы добавить слово, или удерживайте и перетащите его в нужное место. Нажмите на поставленное слово, чтобы убрать его.",
      title: "Переведите предложение",
    },
  },
  loadingScreen: {
    description: "Подождите немного, пока AI генерирует урок.",
    errorDescription: "Проверьте API-ключ и попробуйте снова.",
    errorTitle: "Не удалось сгенерировать урок",
    failedTitle: "Ошибка генерации урока",
    openingLesson: "Открываем экран урока",
    title: "Генерация...",
    topic: "Настройка урока",
  },
  startup: {
    error: "Ошибка запуска",
    failed: "Glosium не удалось запустить.",
  },
};

export default ru;
