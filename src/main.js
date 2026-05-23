import { Router } from "./router.js";
import { notify } from "./ui/notifications.js";
import "./ui/assets/styles/notifications.css";

const router = new Router();

window.glosiumRouter = router;
window.glosiumNotify = notify;

router.navigateTo({ path: "/setup", addToHistory: false }).catch((error) => {
  console.error(error);
  notify.error(error.message || "Glosium could not start.", {
    title: "Startup error",
  });
  const errorElement = document.createElement("p");
  errorElement.textContent = error.message || "Glosium could not start.";
  document.getElementById("app")?.replaceChildren(errorElement);
});
