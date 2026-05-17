export function loadTask(elements, content) {
  const tpl = document.getElementById("tpl-question");
  elements.container.replaceChildren(tpl.content.cloneNode(true));

  // TODO: render `content` into the question template,
  // bind user interactions, manage elements.continueBtn.disabled.

  return function verify() {
    // TODO: return whether the current answer is correct.
    return true;
  };
}
