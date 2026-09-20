import { describe, expect, it } from "vitest";
import { computeUsableHeight, type ViewportMeasure } from "./viewportInsets";

// iPhone 17 Pro Max: 440x956 pt.
const base: ViewportMeasure = {
  innerWidth: 440,
  innerHeight: 834,
  visualHeight: 834,
  smallHeight: 834,
  screenWidth: 440,
  screenHeight: 956,
  iphoneBrowser: true,
};

describe("computeUsableHeight", () => {
  it("reserves room for Safari's floating toolbar when the page is laid out under it", () => {
    expect(computeUsableHeight(base)).toBe(834 - 84);
  });

  it("uses the browser's own smaller viewport when it excludes the toolbar", () => {
    expect(computeUsableHeight({ ...base, innerHeight: 834, visualHeight: 834, smallHeight: 758 })).toBe(758);
  });

  it("does not reserve anything outside an iPhone browser", () => {
    expect(computeUsableHeight({ ...base, iphoneBrowser: false })).toBe(834);
  });

  it("reserves less in landscape", () => {
    const landscape = { ...base, innerWidth: 956, innerHeight: 400, visualHeight: 400, smallHeight: 400, screenWidth: 956, screenHeight: 440 };
    expect(computeUsableHeight(landscape)).toBe(400 - 56);
  });

  it("ignores an unsupported svh probe", () => {
    expect(computeUsableHeight({ ...base, iphoneBrowser: false, smallHeight: 0 })).toBe(834);
  });
});
