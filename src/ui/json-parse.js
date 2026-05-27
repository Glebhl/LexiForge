import { notify } from "./notifications.js";

export class JsonParseNotificationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "JsonParseNotificationError";
    this.cause = cause;
    this.wasNotified = true;
  }
}

function getJsonParseLocation(text, error) {
  const positionMatch = /position (\d+)/i.exec(error.message);

  if (!positionMatch) {
    return null;
  }

  const rawText = String(text);
  const position = Number(positionMatch[1]);
  const beforeError = rawText.slice(0, position);
  const lines = beforeError.split(/\r\n|\r|\n/);
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { column, line, position };
}

export function parseJsonSafely(text, options = {}) {
  const {
    context = "JSON response",
    fallback = null,
    level = "error",
    notifyOnError = true,
    throwOnError = true,
    title = "Invalid JSON",
  } = options;

  try {
    return JSON.parse(text);
  } catch (error) {
    const message = `Could not parse ${context}: ${error.message}`;
    const location = getJsonParseLocation(text, error);

    if (location) {
      console.error(message, {
        column: location.column,
        text: text,
        line: location.line,
        position: location.position,
      });
    } else {
      console.error(message, { text });
    }

    if (notifyOnError) {
      const notifier =
        typeof notify[level] === "function" ? notify[level] : notify.error;
      notifier(message, { title });
    }

    if (throwOnError) {
      throw new JsonParseNotificationError(message, error);
    }

    return fallback;
  }
}

export function wasNotified(error) {
  return error?.wasNotified === true;
}
