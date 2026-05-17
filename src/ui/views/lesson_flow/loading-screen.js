export function showLoadingScreen(elements) {
  if (typeof elements.mountTask === "function") {
    elements.mountTask("tpl-loading");
    return;
  }

  const tpl = document.getElementById("tpl-loading");
  elements.container.replaceChildren(tpl.content.cloneNode(true));
}
