import { Router } from "./router.js";
import {
  ensureLessonLanguage,
  ensurePipelineModels,
  ensureUiLocale,
} from "./storage/index.js";
import { t, updateDocumentLocale } from "./i18n/index.js";
import { notify } from "./ui/notifications.js";
import "./ui/assets/styles/notifications.css";

const router = new Router();

window.glosiumRouter = router;
window.glosiumNotify = notify;

ensurePipelineModels();
ensureLessonLanguage();
ensureUiLocale();
updateDocumentLocale();

router.navigateTo({ path: "/setup", addToHistory: false }).catch((error) => {
  console.error(error);
  notify.error(error.message || t("startup.failed"), {
    title: t("startup.error"),
  });
  const errorElement = document.createElement("p");
  errorElement.textContent = error.message || t("startup.failed");
  document.getElementById("app")?.replaceChildren(errorElement);
});
