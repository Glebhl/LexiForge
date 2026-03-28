document.getElementById("btn-stop").addEventListener("click", function () {
  if (window.backend && typeof window.backend.emitEvent === "function") {
    window.backend.emitEvent("btn-click", { id: "stop" });
  }
});
