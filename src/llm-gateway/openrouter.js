import { parseJsonSafely } from "../ui/json-parse.js";
import { notify } from "../ui/notifications.js";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const API_KEY_STORAGE_NAME = "openrouter_api_key";
const DEFAULT_MAX_TOKENS = 2048;
let missingApiKeyNotified = false;

function getAPIKey() {
  const key =
    globalThis.localStorage?.getItem(API_KEY_STORAGE_NAME)?.trim() || "";

  if (key) {
    console.debug("OpenRouter API key was loaded");
  } else {
    console.warn("OpenRouter API key was not loaded");
    if (!missingApiKeyNotified) {
      missingApiKeyNotified = true;
      notify.warning("Add an OpenRouter API key before generating lessons.", {
        title: "OpenRouter API key missing",
      });
    }
  }

  return key;
}

export class OpenRouterError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "OpenRouterError";
    this.status = details.status;
    this.body = details.body;
  }
}

export class OpenRouterClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || getAPIKey();
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.defaultHeaders = options.headers || {};
    this.appTitle = options.appTitle;
    this.siteUrl = options.siteUrl;
    this.defaultMaxTokens =
      options.maxTokens ?? options.max_tokens ?? DEFAULT_MAX_TOKENS;
  }

  async chat(request, options = {}) {
    const response = await this.postJson(
      "/chat/completions",
      this.withRequestDefaults(request, { stream: false }),
      options,
    );

    return this.readJson(response);
  }

  async *streamChat(request, options = {}) {
    const response = await this.postJson(
      "/chat/completions",
      this.withRequestDefaults(request, { stream: true }),
      options,
    );

    if (!response.ok) {
      await this.throwResponseError(response);
    }

    for await (const eventText of readSseEvents(response.body)) {
      const dataLines = eventText
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (dataLines.length === 0) {
        continue;
      }

      const data = dataLines.join("\n");

      if (data === "[DONE]") {
        return;
      }

      const chunk = parseJsonSafely(data, {
        context: "OpenRouter stream event",
        title: "Invalid OpenRouter response",
      });

      if (chunk.error) {
        throw new OpenRouterError(
          chunk.error.message || "OpenRouter stream error",
          {
            body: chunk,
          },
        );
      }

      yield chunk;
    }
  }

  async listProviders(options = {}) {
    const response = await fetch(this.url("/providers"), {
      method: "GET",
      headers: this.headers(options.headers),
      signal: options.signal,
    });
    const body = await this.readJson(response);

    return Array.isArray(body.data) ? body.data : body;
  }

  async postJson(path, body, options = {}) {
    return fetch(this.url(path), {
      method: "POST",
      headers: this.headers(options.headers),
      body: JSON.stringify(body),
      signal: options.signal,
    });
  }

  withRequestDefaults(request, defaults) {
    const body = {
      ...request,
      ...defaults,
    };

    if (
      this.defaultMaxTokens != null &&
      body.max_tokens == null &&
      body.max_completion_tokens == null
    ) {
      body.max_tokens = this.defaultMaxTokens;
    }

    return body;
  }

  async readJson(response) {
    const body = await readResponseBody(response);

    if (!response.ok) {
      throwResponseBody(response, body);
    }

    return body === ""
      ? null
      : parseJsonSafely(body, {
          context: "OpenRouter response",
          title: "Invalid OpenRouter response",
        });
  }

  async throwResponseError(response) {
    throwResponseBody(response, await readResponseBody(response));
  }

  headers(extraHeaders = {}) {
    if (!this.apiKey) {
      throw new OpenRouterError(
        `OpenRouter API key is missing. Add ${API_KEY_STORAGE_NAME} in storage.html.`,
      );
    }

    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...this.defaultHeaders,
      ...extraHeaders,
    };

    if (this.siteUrl) {
      headers["HTTP-Referer"] = this.siteUrl;
    }

    if (this.appTitle) {
      headers["X-OpenRouter-Title"] = this.appTitle;
    }

    return headers;
  }

  url(path) {
    return `${this.baseUrl}${path}`;
  }
}

async function readResponseBody(response) {
  return response.text();
}

function throwResponseBody(response, body) {
  let message =
    body || `OpenRouter request failed with status ${response.status}`;
  let parsedBody = body;

  try {
    parsedBody = parseJsonSafely(body, {
      context: "OpenRouter error response",
      fallback: body,
      notifyOnError: false,
      throwOnError: false,
    });
    message = parsedBody.error?.message || parsedBody.message || message;
  } catch {
    // Keep the text body as the error message.
  }

  throw new OpenRouterError(message, {
    status: response.status,
    body: parsedBody,
  });
}

async function* readSseEvents(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const eventText of events) {
      yield eventText;
    }
  }

  buffer += decoder.decode();

  if (buffer.trim() !== "") {
    yield buffer;
  }
}
