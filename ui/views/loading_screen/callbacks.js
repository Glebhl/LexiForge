document.getElementById("btn-stop").addEventListener("click", function () {
  window.appBridge.emitBackendEvent("btn-click", { id: "stop" });
});
