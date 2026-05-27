import { t } from "../../../i18n/index.js";

function setupLoadingScreen(root) {
  root.querySelector(".loading-title").textContent = t("lesson.loading.title");
  root.querySelector(".loading-message").textContent = t(
    "lesson.loading.message",
  );
}

export function showLoadingScreen(elements, mountTask) {
  const activeMountTask = mountTask ?? elements.mountTask;

  if (typeof activeMountTask === "function") {
    return activeMountTask("tpl-loading", setupLoadingScreen);
  }
}
