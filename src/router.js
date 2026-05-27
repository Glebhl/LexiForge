import { translateTree } from "./i18n/index.js";

const app = document.getElementById("app");

const routes = {
  "/setup": "./ui/views/lesson_setup",
  "/loading": "./ui/views/loading_screen",
  "/lesson": "./ui/views/lesson_flow",
};

const routeControllerModules = import.meta.glob("./ui/views/**/controller.js");

export class Router {
  constructor() {
    if (!app) {
      throw new Error('Root element "#app" was not found');
    }

    this.history = [];
    this.currentScreen = null;
    this.currentPath = null;
    this.currentOptions = {};
    this.routeStyleLinks = [];
  }

  async navigateTo({ path, addToHistory = true, options = {} }) {
    const route = routes[path];

    if (!route) {
      throw new Error(`Route "${path}" does not exist`);
    }

    if (addToHistory && this.currentPath !== null) {
      this.history.push({
        path: this.currentPath,
        options: this.currentOptions,
      });
    }

    if (
      this.currentScreen &&
      typeof this.currentScreen.unmount === "function"
    ) {
      await this.currentScreen.unmount();
    }

    const routeUrl = new URL(`${route}/`, import.meta.url);
    const html = await this.loadRouteHtml(path, routeUrl);
    const routeDocument = this.parseRouteDocument(html);

    const nextRouteStyleLinks = await this.loadRouteStyles(
      routeDocument,
      routeUrl,
    );
    app.replaceChildren(...this.getRouteBodyNodes(routeDocument, routeUrl));
    translateTree(app);
    this.replaceRouteStyles(nextRouteStyleLinks);

    this.currentScreen = await this.mountRouteController(
      path,
      routeUrl,
      options,
    );
    this.currentPath = path;
    this.currentOptions = options;
  }

  async goBack() {
    if (this.history.length === 0) {
      return null;
    }

    const previousRoute = this.history.pop();

    return this.navigateTo({
      path: previousRoute.path,
      addToHistory: false,
      options: previousRoute.options,
    });
  }

  async loadRouteHtml(path, routeUrl) {
    const response = await fetch(new URL("index.html", routeUrl));

    if (!response.ok) {
      throw new Error(`Failed to load HTML for route "${path}"`);
    }

    return response.text();
  }

  parseRouteDocument(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  getRouteBodyNodes(routeDocument, routeUrl) {
    this.resolveRouteAssetUrls(routeDocument, routeUrl);

    return Array.from(routeDocument.body.childNodes).map((node) =>
      document.importNode(node, true),
    );
  }

  resolveRouteAssetUrls(routeDocument, routeUrl) {
    for (const element of routeDocument.body.querySelectorAll("[src]")) {
      const src = element.getAttribute("src");

      if (src) {
        element.setAttribute("src", new URL(src, routeUrl).href);
      }
    }
  }

  async mountRouteController(path, routeUrl, options) {
    const loadControllerModule =
      routeControllerModules[`${routes[path]}/controller.js`];

    if (!loadControllerModule) {
      throw new Error(`Route "${path}" does not have a controller module`);
    }

    const module = await loadControllerModule();

    if (typeof module.Controller !== "function") {
      throw new Error(`Route "${path}" does not export Controller`);
    }

    const controller = new module.Controller();

    if (typeof controller.mount !== "function") {
      throw new Error(`Route "${path}" does not export Controller.mount()`);
    }

    await controller.mount(this, options);

    return controller;
  }

  async loadRouteStyles(routeDocument, routeUrl) {
    const routeStylesheets = Array.from(
      routeDocument.querySelectorAll('link[rel="stylesheet"]'),
    ).map((sourceLinkElement) => {
      const href = sourceLinkElement.getAttribute("href");
      const linkElement = document.createElement("link");

      linkElement.rel = "stylesheet";
      linkElement.href = new URL(href, routeUrl).href;
      linkElement.dataset.routeStyle = "true";
      const stylesheetReady = this.waitForStylesheet(linkElement);

      document.head.appendChild(linkElement);

      return { linkElement, stylesheetReady };
    });

    const linkElements = routeStylesheets.map(
      (routeStylesheet) => routeStylesheet.linkElement,
    );

    try {
      await Promise.all(
        routeStylesheets.map(
          (routeStylesheet) => routeStylesheet.stylesheetReady,
        ),
      );
    } catch (error) {
      for (const linkElement of linkElements) {
        linkElement.remove();
      }

      throw error;
    }

    return linkElements;
  }

  waitForStylesheet(linkElement) {
    return new Promise((resolve, reject) => {
      linkElement.addEventListener("load", resolve, { once: true });
      linkElement.addEventListener(
        "error",
        () =>
          reject(new Error(`Failed to load stylesheet "${linkElement.href}"`)),
        { once: true },
      );
    });
  }

  replaceRouteStyles(nextRouteStyleLinks) {
    for (const linkElement of this.routeStyleLinks) {
      linkElement.remove();
    }

    this.routeStyleLinks = nextRouteStyleLinks;
  }
}
