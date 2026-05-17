export function loadTask(elements, content) {
  elements.mountTask("tpl-question", (root) => {
    root.querySelector(".question-content").textContent = content?.question || "";
    root.querySelector(".question-paragraph").textContent = content?.paragraph || content?.passage || "";
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
