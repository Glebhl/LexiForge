const LOADING_TITLE = "GENERATING";
const LOADING_MESSAGE = "Please wait while the next exercises are being prepared.";

function setupLoadingScreen(root) {
  root.querySelector(".loading-title").textContent = LOADING_TITLE;
  root.querySelector(".loading-message").textContent = LOADING_MESSAGE;
}

export function showLoadingScreen(elements, mountTask) {
  const activeMountTask = mountTask ?? elements.mountTask;

  if (typeof activeMountTask === "function") {
    return activeMountTask("tpl-loading", setupLoadingScreen);
  }
}
