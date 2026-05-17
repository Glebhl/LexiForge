export function loadTask(elements, mountTask, content) {
  mountTask("tpl-translation", (root) => {
    root.querySelector(".translation-prompt").textContent = content?.sentence || "";
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
