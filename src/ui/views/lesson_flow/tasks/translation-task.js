export function loadTask(elements, mountTask, content) {
  mountTask("tpl-translation", (root) => {
    root.querySelector(".translation-prompt").textContent = content?.sentence || "";
  });

  return function verify() {
    return true;
  };
}
