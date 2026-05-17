export function showLoadingScreen(container) {
  const tpl = document.getElementById("tpl-loading");
  container.replaceChildren(tpl.content.cloneNode(true));
}
