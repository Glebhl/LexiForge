export function loadTask(elements, mountTask, content) {
  mountTask("tpl-explanation", (root) => {
    root.querySelector(".explanation-content").innerHTML = content || "Empty";
    elements.continueBtn.disabled = false;
    elements.skipBtn.disabled = false;
  });

  return function verify() {
    return true;
  };
}
