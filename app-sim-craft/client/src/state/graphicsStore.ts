// Graphics settings: how far the world draws and how much detail it gets,
// so a faster computer can run it prettier and a slower one (or a phone)
// can trade looks for frame rate. Persisted per browser in localStorage (a
// per-viewer convenience, like the touch-controls override).
import { create } from "zustand";
import { isTouchDeviceNow } from "../hooks/useIsTouchDevice";

export type CloudQuality = "off" | "low" | "high";
export type GraphicsPreset = "low" | "medium" | "high" | "ultra" | "custom";

export interface GraphicsSettings {
  preset: GraphicsPreset;
  /** How many chunk columns (32 blocks each) are drawn in every direction. */
  renderDistance: number;
  /** Cap on the render resolution, as a pixel ratio (1 = one rendered pixel per CSS pixel; a retina screen is 2). */
  resolution: number;
  /** Real-time lights (lamps, campfires, torches, headlights, dragon fire) evaluated at once — they're expensive. */
  lights: number;
  clouds: CloudQuality;
  /** Lower the resolution automatically while the frame rate is poor. */
  adaptive: boolean;
}

export const RENDER_DISTANCE_RANGE = { min: 4, max: 16 };
export const RESOLUTION_RANGE = { min: 0.5, max: 2 };
export const LIGHTS_RANGE = { min: 0, max: 12 };

type PresetValues = Omit<GraphicsSettings, "preset" | "adaptive">;

export const PRESET_VALUES: Record<Exclude<GraphicsPreset, "custom">, PresetValues> = {
  low: { renderDistance: 6, resolution: 1, lights: 2, clouds: "low" },
  medium: { renderDistance: 8, resolution: 1.5, lights: 4, clouds: "high" },
  high: { renderDistance: 10, resolution: 2, lights: 6, clouds: "high" },
  ultra: { renderDistance: 16, resolution: 2, lights: 10, clouds: "high" },
};

const STORAGE_KEY = "simcraft:graphics";

function defaults(): GraphicsSettings {
  // Phones start on Low; everything else on High (what the game used to be hard-wired to).
  const preset = isTouchDeviceNow() ? "low" : "high";
  return { preset, ...PRESET_VALUES[preset], adaptive: true };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Normalises anything read from storage into valid settings. */
export function sanitizeSettings(raw: unknown): GraphicsSettings {
  const base = defaults();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<GraphicsSettings>;
  const preset: GraphicsPreset = r.preset === "low" || r.preset === "medium" || r.preset === "high" || r.preset === "ultra" || r.preset === "custom" ? r.preset : base.preset;
  const clouds: CloudQuality = r.clouds === "off" || r.clouds === "low" || r.clouds === "high" ? r.clouds : base.clouds;
  return {
    preset,
    renderDistance: Math.round(clamp(Number(r.renderDistance ?? base.renderDistance), RENDER_DISTANCE_RANGE.min, RENDER_DISTANCE_RANGE.max)),
    resolution: clamp(Number(r.resolution ?? base.resolution), RESOLUTION_RANGE.min, RESOLUTION_RANGE.max),
    lights: Math.round(clamp(Number(r.lights ?? base.lights), LIGHTS_RANGE.min, LIGHTS_RANGE.max)),
    clouds,
    adaptive: typeof r.adaptive === "boolean" ? r.adaptive : base.adaptive,
  };
}

function load(): GraphicsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

function save(settings: GraphicsSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Per-viewer convenience only — non-fatal if storage is unavailable.
  }
}

interface GraphicsState {
  settings: GraphicsSettings;
  applyPreset: (preset: Exclude<GraphicsPreset, "custom">) => void;
  /** Changes individual settings; the preset becomes "custom" unless it still matches one exactly. */
  update: (patch: Partial<Omit<GraphicsSettings, "preset">>) => void;
}

function matchingPreset(s: PresetValues): GraphicsPreset {
  for (const [name, values] of Object.entries(PRESET_VALUES)) {
    if (values.renderDistance === s.renderDistance && values.resolution === s.resolution && values.lights === s.lights && values.clouds === s.clouds) {
      return name as GraphicsPreset;
    }
  }
  return "custom";
}

export const useGraphicsStore = create<GraphicsState>((set) => ({
  settings: load(),
  applyPreset: (preset) =>
    set((state) => {
      const settings: GraphicsSettings = { ...state.settings, preset, ...PRESET_VALUES[preset] };
      save(settings);
      return { settings };
    }),
  update: (patch) =>
    set((state) => {
      const merged = { ...state.settings, ...patch };
      const settings: GraphicsSettings = { ...merged, preset: matchingPreset(merged) };
      save(settings);
      return { settings };
    }),
}));
