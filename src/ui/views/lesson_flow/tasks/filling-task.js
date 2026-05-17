export function loadTask(elements, content) {
  const tpl = document.getElementById("tpl-filling");
  elements.container.replaceChildren(tpl.content.cloneNode(true));

  // TODO: render `content` into the filling template,
  // bind word-bank/typing interactions, manage elements.continueBtn.disabled.

  return function verify() {
    // TODO: return whether the filled answer is correct.
    return true;
  };
}
