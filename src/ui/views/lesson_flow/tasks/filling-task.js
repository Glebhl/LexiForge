export function loadTask(elements, mountTask, content) {
  mountTask("tpl-filling", () => {
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
