const DEFAULT_PANEL = "settings";

export function initLessonSetupTabs(rootElement = document) {
  const bottomShell = rootElement.querySelector(".bottom-shell");
  const tabElements = Array.from(rootElement.querySelectorAll("[data-setup-tab]"));
  const panelElements = Array.from(rootElement.querySelectorAll("[data-setup-panel]"));

  if (!bottomShell || tabElements.length === 0 || panelElements.length === 0) {
    return function () {};
  }

  function showPanel(panelName) {
    const activePanel = panelName || DEFAULT_PANEL;

    bottomShell.dataset.activePanel = activePanel;

    tabElements.forEach(function (tabElement) {
      const isActive = tabElement.dataset.setupTab === activePanel;

      tabElement.classList.toggle("is-active", isActive);
      tabElement.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    panelElements.forEach(function (panelElement) {
      panelElement.classList.toggle("is-active", panelElement.dataset.setupPanel === activePanel);
    });
  }

  tabElements.forEach(function (tabElement) {
    tabElement.addEventListener("click", function () {
      showPanel(tabElement.dataset.setupTab);
    });
  });

  showPanel(bottomShell.dataset.activePanel || DEFAULT_PANEL);

  return showPanel;
}
