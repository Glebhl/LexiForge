export function loadTask(elements, mountTask, content) {
  mountTask("tpl-explanation", (root) => {
    root.textContent = content || "";
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
