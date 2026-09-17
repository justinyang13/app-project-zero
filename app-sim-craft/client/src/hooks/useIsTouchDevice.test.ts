import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTouchOverride, isTouchDeviceNow, resolveTouchMode, setTouchOverride } from "./useIsTouchDevice";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
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
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("resolveTouchMode (pure)", () => {
  it("follows detection when there's no override", () => {
    expect(resolveTouchMode(true, null)).toBe(true);
    expect(resolveTouchMode(false, null)).toBe(false);
  });

  it("a 'touch' override wins even when detection says desktop", () => {
    expect(resolveTouchMode(false, "touch")).toBe(true);
  });

  it("a 'desktop' override wins even when detection says touch — a touchscreen laptop with a mouse attached", () => {
    expect(resolveTouchMode(true, "desktop")).toBe(false);
  });
});

describe("isTouchDeviceNow (stubbed globals, no jsdom needed)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false with no window at all (matches this project's plain Node test environment)", () => {
    expect(isTouchDeviceNow()).toBe(false);
  });

  it("reflects a coarse-pointer/no-hover matchMedia result", () => {
    vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: query.includes("coarse"), media: query }) });
    expect(isTouchDeviceNow()).toBe(true);
  });

  it("reflects a fine-pointer/hover-capable matchMedia result", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(isTouchDeviceNow()).toBe(false);
  });

  it("the manual override wins over matchMedia either way", () => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("localStorage", new MemoryStorage());
    setTouchOverride("touch");
    expect(isTouchDeviceNow()).toBe(true);

    setTouchOverride("desktop");
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(isTouchDeviceNow()).toBe(false);
  });
});

describe("touch override persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips through get/set, and null clears it back to auto-detect", () => {
    expect(getTouchOverride()).toBeNull();
    setTouchOverride("touch");
    expect(getTouchOverride()).toBe("touch");
    setTouchOverride(null);
    expect(getTouchOverride()).toBeNull();
  });
});
