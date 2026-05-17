export function loadTask(elements, content) {
  const tpl = document.getElementById("tpl-explanation");
  elements.container.replaceChildren(tpl.content.cloneNode(true));

  // TODO: render `content` (markdown string) into the explanation template,
  // manage elements.continueBtn.disabled.

  return function verify() {
    return true;
  };
}
