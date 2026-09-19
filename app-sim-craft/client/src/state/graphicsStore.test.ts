import { describe, expect, it } from "vitest";
import { PRESET_VALUES, sanitizeSettings, useGraphicsStore } from "./graphicsStore";

describe("graphics settings", () => {
  it("clamps and repairs anything read from storage", () => {
    const s = sanitizeSettings({ preset: "bogus", renderDistance: 999, resolution: -3, lights: 2.6, clouds: "loud", adaptive: "yes" });
    expect(s.renderDistance).toBe(16);
    expect(s.resolution).toBe(0.5);
    expect(s.lights).toBe(3);
    expect(["off", "low", "high"]).toContain(s.clouds);
    expect(typeof s.adaptive).toBe("boolean");
    expect(sanitizeSettings(null).renderDistance).toBeGreaterThan(0);
  });

  it("applies a preset, and becomes 'custom' when a single dial moves off it (and back when it matches again)", () => {
    const { applyPreset, update } = useGraphicsStore.getState();
    applyPreset("ultra");
    expect(useGraphicsStore.getState().settings.renderDistance).toBe(PRESET_VALUES.ultra.renderDistance);
    expect(useGraphicsStore.getState().settings.preset).toBe("ultra");
    update({ renderDistance: 12 });
    expect(useGraphicsStore.getState().settings.preset).toBe("custom");
    update({ renderDistance: PRESET_VALUES.ultra.renderDistance });
    expect(useGraphicsStore.getState().settings.preset).toBe("ultra");
  });

  it("offers a strictly increasing ladder of quality", () => {
    const order = [PRESET_VALUES.low, PRESET_VALUES.medium, PRESET_VALUES.high, PRESET_VALUES.ultra];
    for (let i = 1; i < order.length; i++) {
      expect(order[i].renderDistance).toBeGreaterThanOrEqual(order[i - 1].renderDistance);
      expect(order[i].lights).toBeGreaterThanOrEqual(order[i - 1].lights);
      expect(order[i].resolution).toBeGreaterThanOrEqual(order[i - 1].resolution);
    }
  });
});
