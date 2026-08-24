import "@testing-library/jest-dom/vitest";

// This Vitest/jsdom/Node combination exposes a `window.localStorage` that's
// missing most of the Storage prototype (no .clear(), etc.) — replace it
// with a standard in-memory implementation so tests get real Storage
// semantics regardless of the host environment's quirks.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, "localStorage", {
  value: new MemoryStorage(),
  writable: true,
  configurable: true,
});
