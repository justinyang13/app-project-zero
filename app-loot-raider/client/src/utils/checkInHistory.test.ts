import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasReportedToday, recordReport } from "./checkInHistory";

// Newer Node versions ship their own global `localStorage` (behind
// --experimental-webstorage) that can shadow jsdom's, and is non-functional
// without --localstorage-file. Stub a real in-memory Storage per test so
// this suite behaves the same regardless of the host Node version.
class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
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
    this.store.set(key, value);
  }
}

describe("checkInHistory", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("reports false for an item that has never been recorded", () => {
    expect(hasReportedToday("venue-1", "item-1")).toBe(false);
  });

  it("reports true for an item recorded today", () => {
    recordReport("venue-1", "item-1");

    expect(hasReportedToday("venue-1", "item-1")).toBe(true);
  });

  it("keeps venues and items independent", () => {
    recordReport("venue-1", "item-1");

    expect(hasReportedToday("venue-2", "item-1")).toBe(false);
    expect(hasReportedToday("venue-1", "item-2")).toBe(false);
  });
});
