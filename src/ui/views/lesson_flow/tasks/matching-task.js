export function loadTask(elements, content) {
  const tpl = document.getElementById("tpl-matching");
  elements.container.replaceChildren(tpl.content.cloneNode(true));

  // TODO: render `content` pairs into the matching grid,
  // bind selection interactions, manage elements.continueBtn.disabled.

  return function verify() {
    // TODO: return whether all pairs are matched correctly.
    return true;
  };
}
