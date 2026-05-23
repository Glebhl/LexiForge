import { notify } from "./notifications.js";

export class JsonParseNotificationError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "JsonParseNotificationError";
    this.cause = cause;
    this.wasNotified = true;
  }
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
