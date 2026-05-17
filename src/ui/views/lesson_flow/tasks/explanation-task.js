export function loadTask(elements, content) {
  elements.mountTask("tpl-explanation", (root) => {
    root.textContent = content || "";
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
