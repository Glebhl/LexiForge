export function loadTask(elements, content) {
  const tpl = document.getElementById("tpl-translation");
  elements.container.replaceChildren(tpl.content.cloneNode(true));

  // TODO: render `content` into the translation template,
  // bind word-bank/typing interactions, manage elements.continueBtn.disabled.

  return function verify() {
    // TODO: return whether the translation is correct.
    return true;
  };
}
