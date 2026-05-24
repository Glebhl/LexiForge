const PROMPT_MODULES = import.meta.glob("./**/*.txt", {
  query: "?raw",
  import: "default",
});

export async function loadPrompt(promptPath) {
  const normalizedPath = normalizePromptPath(promptPath);
  const loadPromptModule = PROMPT_MODULES[normalizedPath];

  if (!loadPromptModule) {
    throw new Error(`Could not load prompt from ${normalizedPath}`);
  }

  return loadPromptModule();
}

function normalizePromptPath(promptPath) {
  const pathWithForwardSlashes = String(promptPath).replaceAll("\\", "/");
  const normalizedPath = pathWithForwardSlashes
    .replace(/\/+/g, "/")
    .replace(/^\.?\//, "");

  if (/\/{2,}/.test(pathWithForwardSlashes)) {
    console.warn("Prompt path contains duplicate slashes.", {
      promptPath,
      normalizedPath,
    });
  }

  return `./${normalizedPath}`;
}
