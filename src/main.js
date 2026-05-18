import { Router } from "./router.js";

const router = new Router();

window.glosiumRouter = router;

router.navigateTo({ path: "/setup", addToHistory: false }).catch((error) => {
  console.error(error);
  const errorElement = document.createElement("p");
  errorElement.textContent = error.message || "Glosium could not start.";
  document.getElementById("app")?.replaceChildren(errorElement);
});
