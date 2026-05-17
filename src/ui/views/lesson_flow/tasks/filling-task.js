export function loadTask(elements, content) {
  elements.mountTask("tpl-filling", () => {
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
