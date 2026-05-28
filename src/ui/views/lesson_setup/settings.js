import { appStorage } from "../../../storage/index.js";
import { t } from "../../../i18n/index.js";

const DEFAULT_LANGUAGE_LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"];

const DEFAULT_TASKS = [
  {
    id: "explanation",
    labelKey: "settings.tasks.explanation.label",
    descriptionKey: "settings.tasks.explanation.description",
  },
  {
    id: "matching",
    labelKey: "settings.tasks.matching.label",
    descriptionKey: "settings.tasks.matching.description",
  },
  {
    id: "filling",
    labelKey: "settings.tasks.filling.label",
    descriptionKey: "settings.tasks.filling.description",
  },
  {
    id: "translation",
    labelKey: "settings.tasks.translation.label",
    descriptionKey: "settings.tasks.translation.description",
  },
  {
    id: "question",
    labelKey: "settings.tasks.question.label",
    descriptionKey: "settings.tasks.question.description",
  },
];

let settings = loadSettingsValues();
let detachScrollFade = null;

export function onChange(id, value) {
  console.log(`id=${id} value=${value}`);

  if (id === "languageLevel") {
    appStorage.setItem("languageLevel", value);
  }
}

export function loadSettings({
  availableTasks = DEFAULT_TASKS,
  languageLevels = DEFAULT_LANGUAGE_LEVELS,
  lessonGenerators = ["N/A"],
  isAdditionalRequestAvailable = true,
} = {}) {
  const settingsContent = getSettingsContent();

  settingsContent.replaceChildren();
  settingsContent.appendChild(
    renderLessonProfileGroup(languageLevels, lessonGenerators),
  );

  const tuningGroup = renderLessonTuningGroup(
    availableTasks,
    isAdditionalRequestAvailable,
  );
  if (tuningGroup) {
    settingsContent.appendChild(tuningGroup);
  }

  attachScrollFade(settingsContent);
  updateScrollFade(settingsContent);
}

export function getSettingsValue(key) {
  return settings[key];
}

export function destroySettings() {
  if (detachScrollFade) {
    detachScrollFade();
    detachScrollFade = null;
  }
}

function getSettingsContent() {
  const settingsContent = document.getElementById("settings-content");

  if (!settingsContent) {
    throw new Error("Lesson setup settings view is not mounted");
  }

  return settingsContent;
}

function loadSettingsValues() {
  return {
    languageLevel: appStorage.getItem("languageLevel", "A1"),
    lessonGeneratorId: "default",
    additionalRequest: "",
    disabledTaskIds: [],
  };
}

function emitChange(id, value) {
  onChange(id, value);
}

function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = String(textContent);
  }

  return element;
}

function createGroup(title) {
  const groupElement = createElement("section", "settings-group");

  if (title) {
    groupElement.appendChild(createElement("p", "settings-group-title", title));
  }

  return groupElement;
}

function createSettingShell(title, description) {
  const shellElement = createElement("section", "settings-item-shell");
  const headElement = createElement("div", "settings-item-head");

  headElement.appendChild(createElement("p", "settings-item-title", title));

  if (description) {
    headElement.appendChild(
      createElement("p", "settings-item-description", description),
    );
  }

  shellElement.appendChild(headElement);
  return shellElement;
}

function renderLessonProfileGroup(languageLevels, lessonGenerators) {
  const groupElement = createGroup(t("settings.groups.profile"));

  groupElement.appendChild(renderLevelPicker(languageLevels));

  if (lessonGenerators.length > 0) {
    groupElement.appendChild(renderGeneratorSelect(lessonGenerators));
  }

  return groupElement;
}

function renderGeneratorSelect(lessonGenerators) {
  const shellElement = createSettingShell(
    t("settings.generator.title"),
    t("settings.generator.description"),
  );
  const selectElement = createElement("select", "settings-select");

  lessonGenerators.forEach(function (generator) {
    const optionElement = document.createElement("option");
    const generatorId = String(generator.id || "");

    optionElement.value = generatorId;
    optionElement.textContent = generator.labelKey
      ? t(generator.labelKey)
      : generator.label || generatorId;
    selectElement.appendChild(optionElement);
  });

  selectElement.value = settings.lessonGeneratorId;
  selectElement.addEventListener("change", function () {
    settings.lessonGeneratorId = selectElement.value;
    emitChange("lessonGeneratorId", settings.lessonGeneratorId);
  });

  shellElement.appendChild(selectElement);
  return shellElement;
}

function renderLessonTuningGroup(availableTasks, isAdditionalRequestAvailable) {
  const groupElement = createGroup(t("settings.groups.tuning"));
  let hasItems = false;

  if (isAdditionalRequestAvailable) {
    groupElement.appendChild(renderAdditionalRequest());
    hasItems = true;
  }

  if (availableTasks.length > 0) {
    groupElement.appendChild(renderTaskToggles(availableTasks));
    hasItems = true;
  }

  return hasItems ? groupElement : null;
}

function renderLevelPicker(languageLevels) {
  const shellElement = createSettingShell(
    t("settings.learnerLevel.title"),
    t("settings.learnerLevel.description"),
  );
  const pickerElement = createElement("div", "settings-level-picker");
  const trackElement = createElement("div", "settings-level-track");

  trackElement.style.setProperty(
    "--settings-level-count",
    String(languageLevels.length || 1),
  );

  languageLevels.forEach(function (level) {
    const levelValue = String(level);
    const buttonElement = createElement("button", "settings-level-step");

    buttonElement.type = "button";
    buttonElement.dataset.value = levelValue;
    buttonElement.setAttribute("aria-pressed", "false");
    buttonElement.appendChild(createElement("span", "settings-level-dot"));
    buttonElement.appendChild(
      createElement("span", "settings-level-label", levelValue),
    );
    buttonElement.addEventListener("click", function () {
      settings.languageLevel = levelValue;
      setLevelPickerValue(trackElement, levelValue);
      emitChange("languageLevel", levelValue);
    });

    trackElement.appendChild(buttonElement);
  });

  setLevelPickerValue(trackElement, settings.languageLevel);
  pickerElement.appendChild(trackElement);
  shellElement.appendChild(pickerElement);

  return shellElement;
}

function setLevelPickerValue(trackElement, value) {
  Array.from(trackElement.querySelectorAll(".settings-level-step")).forEach(
    function (buttonElement) {
      const isActive = buttonElement.dataset.value === value;

      buttonElement.classList.toggle("is-active", isActive);
      buttonElement.setAttribute("aria-pressed", isActive ? "true" : "false");
    },
  );
}

function renderAdditionalRequest() {
  const shellElement = createSettingShell(
    t("settings.additionalRequest.title"),
    t("settings.additionalRequest.description"),
  );
  const textareaElement = createElement("textarea", "request-input-area");

  textareaElement.value = settings.additionalRequest;
  textareaElement.rows = 4;
  textareaElement.placeholder = t("settings.additionalRequest.placeholder");
  textareaElement.addEventListener("input", function () {
    settings.additionalRequest = textareaElement.value;
    emitChange("additionalRequest", settings.additionalRequest);
  });

  shellElement.appendChild(textareaElement);
  return shellElement;
}

function renderTaskToggles(availableTasks) {
  const shellElement = createSettingShell(
    t("settings.exerciseTypes.title"),
    t("settings.exerciseTypes.description"),
  );
  const listElement = createElement("div", "settings-toggle-list");

  availableTasks.forEach(function (task) {
    listElement.appendChild(createTaskToggle(task, listElement));
  });

  updateTaskAvailability(listElement);
  shellElement.appendChild(listElement);
  return shellElement;
}

function createTaskToggle(task, listElement) {
  const taskId = String(task.id ?? task.value ?? "");
  const rowElement = createElement("label", "settings-toggle");
  const switchElement = createElement("span", "switch");
  const inputElement = document.createElement("input");
  const sliderElement = createElement("span", "slider");
  const bodyElement = createElement("span", "settings-toggle__body");
  const statusElement = createElement("span", "settings-toggle__status");

  inputElement.type = "checkbox";
  inputElement.className = "settings-toggle__input";
  inputElement.value = taskId;
  inputElement.checked = !settings.disabledTaskIds.includes(taskId);

  bodyElement.appendChild(
    createElement(
      "span",
      "settings-toggle__label",
      task.labelKey ? t(task.labelKey) : task.label || taskId,
    ),
  );
  bodyElement.appendChild(
    createElement(
      "span",
      "settings-toggle__description",
      task.descriptionKey ? t(task.descriptionKey) : task.description || "",
    ),
  );
  updateTaskStatus(statusElement, inputElement.checked);

  inputElement.addEventListener("change", function () {
    if (!inputElement.checked && countCheckedTasks(listElement) === 0) {
      inputElement.checked = true;
      return;
    }

    updateTaskStatus(statusElement, inputElement.checked);
    settings.disabledTaskIds = getDisabledTaskIds(listElement);
    updateTaskAvailability(listElement);
    emitChange("disabledTaskIds", settings.disabledTaskIds.slice());
  });

  switchElement.appendChild(inputElement);
  switchElement.appendChild(sliderElement);
  rowElement.appendChild(switchElement);
  rowElement.appendChild(bodyElement);
  rowElement.appendChild(statusElement);

  return rowElement;
}

function countCheckedTasks(listElement) {
  return listElement.querySelectorAll(".settings-toggle__input:checked").length;
}

function getDisabledTaskIds(listElement) {
  return Array.from(listElement.querySelectorAll(".settings-toggle__input"))
    .filter(function (inputElement) {
      return !inputElement.checked;
    })
    .map(function (inputElement) {
      return inputElement.value;
    });
}

function updateTaskStatus(statusElement, isChecked) {
  statusElement.textContent = isChecked ? t("common.on") : t("common.off");
}

function updateTaskAvailability(listElement) {
  const inputs = Array.from(
    listElement.querySelectorAll(".settings-toggle__input"),
  );
  const checkedCount = countCheckedTasks(listElement);

  inputs.forEach(function (inputElement) {
    inputElement.disabled = checkedCount === 1 && inputElement.checked;
  });
}

function attachScrollFade(rootElement) {
  if (detachScrollFade) {
    detachScrollFade();
  }

  function handleScrollFade() {
    updateScrollFade(rootElement);
  }

  rootElement.addEventListener("scroll", handleScrollFade);
  window.addEventListener("resize", handleScrollFade);

  detachScrollFade = function () {
    rootElement.removeEventListener("scroll", handleScrollFade);
    window.removeEventListener("resize", handleScrollFade);
  };
}

function updateScrollFade(rootElement) {
  const maxScrollTop = Math.max(
    rootElement.scrollHeight - rootElement.clientHeight,
    0,
  );
  const fadeDistance = 80;
  const topFade = Math.min(rootElement.scrollTop / fadeDistance, 1);
  const bottomFade =
    maxScrollTop === 0
      ? 0
      : Math.min((maxScrollTop - rootElement.scrollTop) / fadeDistance, 1);

  rootElement.style.setProperty(
    "--settings-top-fade-start-alpha",
    String(1 - topFade),
  );
  rootElement.style.setProperty(
    "--settings-bottom-fade-start-alpha",
    String(1 - bottomFade),
  );
}
