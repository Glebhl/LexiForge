const LEVELS = new Set(["debug", "info", "warning", "error"]);
const DEFAULT_DURATION_MS = {
  debug: 4000,
  info: 5000,
  warning: 7000,
  error: 9000,
};
const DEFAULT_TITLES = {
  debug: "Debug",
  info: "Info",
  warning: "Warning",
  error: "Error",
};

let nextNotificationId = 0;

class NotificationCenter {
  constructor() {
    this.container = null;
    this.items = new Map();
    this.hoveredIds = new Set();
  }

  show(optionsOrMessage, maybeOptions = {}) {
    const options = this.normalizeOptions(optionsOrMessage, maybeOptions);

    if (!options.message && !options.title) {
      return null;
    }

    const item = {
      id: this.createId(),
      level: options.level,
      title: options.title || DEFAULT_TITLES[options.level],
      message: options.message,
      duration: options.duration,
      timerId: null,
      closing: false,
    };

    const element = this.createElement(item);
    item.element = element;
    this.items.set(item.id, item);
    this.ensureContainer().prepend(element);

    requestAnimationFrame(() => {
      element.classList.add("is-visible");
    });

    if (this.hoveredIds.size === 0) {
      this.scheduleDismiss(item);
    }

    return item.id;
  }

  debug(message, options = {}) {
    return this.show({ ...options, level: "debug", message });
  }

  info(message, options = {}) {
    return this.show({ ...options, level: "info", message });
  }

  warning(message, options = {}) {
    return this.show({ ...options, level: "warning", message });
  }

  error(message, options = {}) {
    return this.show({ ...options, level: "error", message });
  }

  close(id) {
    const item = this.items.get(id);

    if (!item || item.closing) {
      return false;
    }

    item.closing = true;
    this.hoveredIds.delete(id);
    window.clearTimeout(item.timerId);
    item.element.classList.remove("is-visible");
    item.element.classList.add("is-leaving");
    item.element.addEventListener(
      "transitionend",
      () => {
        item.element.remove();
        this.items.delete(id);
        this.restartTimersIfNeeded();
      },
      { once: true },
    );

    window.setTimeout(() => {
      if (this.items.has(id)) {
        item.element.remove();
        this.items.delete(id);
        this.restartTimersIfNeeded();
      }
    }, 260);

    return true;
  }

  clear() {
    for (const id of Array.from(this.items.keys())) {
      this.close(id);
    }
  }

  normalizeOptions(optionsOrMessage, maybeOptions) {
    const source =
      typeof optionsOrMessage === "object" && optionsOrMessage !== null
        ? optionsOrMessage
        : { ...maybeOptions, message: optionsOrMessage };
    const level = LEVELS.has(source.level) ? source.level : "info";
    const duration =
      Number.isFinite(source.duration) && source.duration > 0
        ? source.duration
        : DEFAULT_DURATION_MS[level];

    return {
      duration,
      level,
      message: source.message == null ? "" : String(source.message),
      title: source.title == null ? "" : String(source.title),
    };
  }

  createId() {
    nextNotificationId += 1;
    return `glosium-notification-${nextNotificationId}`;
  }

  ensureContainer() {
    if (this.container) {
      return this.container;
    }

    this.container = document.createElement("div");
    this.container.className = "glosium-notifications";
    this.container.setAttribute("aria-label", "Notifications");
    document.body.append(this.container);

    return this.container;
  }

  createElement(item) {
    const element = document.createElement("section");
    element.className = `glosium-notification glosium-notification--${item.level}`;
    element.dataset.notificationId = item.id;
    element.setAttribute(
      "role",
      item.level === "error" || item.level === "warning" ? "alert" : "status",
    );
    element.setAttribute(
      "aria-live",
      item.level === "error" || item.level === "warning"
        ? "assertive"
        : "polite",
    );

    const marker = document.createElement("span");
    marker.className = "glosium-notification__marker";
    marker.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "glosium-notification__content";

    const title = document.createElement("p");
    title.className = "glosium-notification__title";
    title.textContent = item.title;
    content.append(title);

    if (item.message) {
      const message = document.createElement("p");
      message.className = "glosium-notification__message";
      message.textContent = item.message;
      content.append(message);
    }

    const closeButton = this.createCloseButton(item.id);

    element.append(marker, content, closeButton);
    element.addEventListener("pointerenter", () => {
      this.handlePointerEnter(item.id);
    });
    element.addEventListener("pointerleave", () => {
      this.handlePointerLeave(item.id);
    });

    return element;
  }

  createCloseButton(id) {
    const button = document.createElement("button");
    button.className = "glosium-notification__close";
    button.type = "button";
    button.setAttribute("aria-label", "Close notification");

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");

    const firstPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    firstPath.setAttribute("d", "M18 6 6 18");

    const secondPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    secondPath.setAttribute("d", "m6 6 12 12");

    for (const path of [firstPath, secondPath]) {
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("stroke-linecap", "round");
    }

    icon.append(firstPath, secondPath);
    button.append(icon);
    button.addEventListener("click", () => {
      this.close(id);
    });

    return button;
  }

  handlePointerEnter(id) {
    if (!this.items.has(id)) {
      return;
    }

    this.hoveredIds.add(id);
    this.resetAllTimers();
  }

  handlePointerLeave(id) {
    this.hoveredIds.delete(id);
    this.restartTimersIfNeeded();
  }

  resetAllTimers() {
    for (const item of this.items.values()) {
      window.clearTimeout(item.timerId);
      item.timerId = null;
    }
  }

  restartTimersIfNeeded() {
    if (this.hoveredIds.size > 0) {
      return;
    }

    for (const item of this.items.values()) {
      this.scheduleDismiss(item);
    }
  }

  scheduleDismiss(item) {
    if (item.closing) {
      return;
    }

    window.clearTimeout(item.timerId);
    item.timerId = window.setTimeout(() => {
      this.close(item.id);
    }, item.duration);
  }
}

const notificationCenter = new NotificationCenter();

function notify(message, options = {}) {
  return notificationCenter.show(message, options);
}

notify.show = notificationCenter.show.bind(notificationCenter);
notify.debug = notificationCenter.debug.bind(notificationCenter);
notify.info = notificationCenter.info.bind(notificationCenter);
notify.warning = notificationCenter.warning.bind(notificationCenter);
notify.error = notificationCenter.error.bind(notificationCenter);
notify.close = notificationCenter.close.bind(notificationCenter);
notify.clear = notificationCenter.clear.bind(notificationCenter);

export { notify };
