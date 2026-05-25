export class LocalStorageStore {
  constructor({ storage = globalThis.localStorage, prefix = "" } = {}) {
    this.storage = storage;
    this.prefix = prefix;
  }

  isAvailable() {
    return Boolean(this.storage);
  }

  getItem(key, fallback = null) {
    const value = this.storage?.getItem(this.key(key));

    return value ?? fallback;
  }

  setItem(key, value) {
    this.requireStorage().setItem(this.key(key), String(value));

    return value;
  }

  removeItem(key) {
    this.storage?.removeItem(this.key(key));
  }

  hasItem(key) {
    return this.getItem(key) !== null;
  }

  getJson(key, fallback = null) {
    const value = this.getItem(key);

    return value === null ? fallback : JSON.parse(value);
  }

  setJson(key, value) {
    this.setItem(key, JSON.stringify(value));

    return value;
  }

  keys() {
    const storage = this.storage;

    if (!storage) {
      return [];
    }

    return Array.from({ length: storage.length }, (_, index) =>
      storage.key(index),
    )
      .filter((key) => key?.startsWith(this.prefix))
      .map((key) => this.unkey(key));
  }

  entries() {
    return this.keys().map((key) => [key, this.getItem(key)]);
  }

  clear() {
    const storage = this.storage;

    if (!storage) {
      return;
    }

    if (!this.prefix) {
      storage.clear();
      return;
    }

    for (const key of this.keys()) {
      this.removeItem(key);
    }
  }

  key(key) {
    return `${this.prefix}${key}`;
  }

  unkey(key) {
    return this.prefix ? key.slice(this.prefix.length) : key;
  }

  requireStorage() {
    if (!this.storage) {
      throw new Error("localStorage is not available");
    }

    return this.storage;
  }
}
