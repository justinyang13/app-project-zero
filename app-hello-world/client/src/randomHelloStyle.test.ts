import { describe, expect, it } from "vitest";
import { FONTS, pickRandomHelloStyle } from "./randomHelloStyle";

const HSL_PATTERN = /^hsl\(\d{1,3}, \d{1,2}%, \d{1,2}%\)$/;

describe("pickRandomHelloStyle", () => {
  it("returns a font from the curated list, a valid angle, and three valid HSL colors", () => {
    const style = pickRandomHelloStyle();

    expect(FONTS).toContain(style.fontFamily);
    expect(style.gradientAngle).toBeGreaterThanOrEqual(0);
    expect(style.gradientAngle).toBeLessThan(360);
    expect(style.colors).toHaveLength(3);
    for (const color of style.colors) {
      expect(color).toMatch(HSL_PATTERN);
    }
  });

  it("varies across calls", () => {
    const results = new Set(Array.from({ length: 20 }, () => JSON.stringify(pickRandomHelloStyle())));

    expect(results.size).toBeGreaterThan(1);
  });
});
