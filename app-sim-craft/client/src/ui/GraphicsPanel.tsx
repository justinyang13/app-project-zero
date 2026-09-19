import { useState } from "react";
import {
  LIGHTS_RANGE,
  PRESET_VALUES,
  RENDER_DISTANCE_RANGE,
  RESOLUTION_RANGE,
  useGraphicsStore,
  type CloudQuality,
  type GraphicsPreset,
} from "../state/graphicsStore";
import { useHudStore } from "../state/hudStore";
import { useIsTouchDevice } from "../hooks/useIsTouchDevice";

const PRESET_LABELS: { key: Exclude<GraphicsPreset, "custom">; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "ultra", label: "Ultra" },
];
const CLOUD_OPTIONS: { key: CloudQuality; label: string }[] = [
  { key: "off", label: "Off" },
  { key: "low", label: "Low" },
  { key: "high", label: "High" },
];

const CHIP: React.CSSProperties = {
  flex: 1,
  fontFamily: "monospace",
  fontSize: 11,
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 4,
  padding: "6px 4px",
  cursor: "pointer",
  touchAction: "manipulation",
};

function chipStyle(active: boolean): React.CSSProperties {
  return { ...CHIP, background: active ? "rgba(90,160,255,0.55)" : "rgba(255,255,255,0.12)" };
}

/**
 * A ⚙ button that opens the graphics settings: a preset (Low → Ultra) and
 * the individual dials behind it — how far the world draws, the render
 * resolution, how many dynamic lights are live, and cloud detail. Changes
 * apply immediately and are remembered (state/graphicsStore.ts).
 */
export function GraphicsPanel() {
  const isTouch = useIsTouchDevice();
  const [open, setOpen] = useState(false);
  const settings = useGraphicsStore((s) => s.settings);
  const applyPreset = useGraphicsStore((s) => s.applyPreset);
  const update = useGraphicsStore((s) => s.update);
  const fps = useHudStore((s) => s.debug.fps);

  return (
    <div
      // Game shortcuts listen on `window`; keep typing/dragging here from triggering them.
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: 12, right: 62, zIndex: 20, fontFamily: "monospace", color: "#fff" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        title="Graphics settings"
        style={{
          width: isTouch ? 40 : 32,
          height: isTouch ? 40 : 32,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.5)",
          background: open ? "rgba(90,160,255,0.6)" : "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: isTouch ? 20 : 16,
          cursor: "pointer",
          touchAction: "manipulation",
          padding: 0,
        }}
      >
        ⚙
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: isTouch ? 48 : 40,
            right: 0,
            width: isTouch ? "min(300px, calc(100vw - 24px))" : 280,
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            boxSizing: "border-box",
            padding: 12,
            background: "rgba(0,0,0,0.8)",
            borderRadius: 8,
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <strong>Graphics</strong>
            <span style={{ opacity: 0.7 }}>{fps > 0 ? `${fps} fps` : ""}</span>
          </div>

          <div>
            <div style={{ marginBottom: 4, opacity: 0.8 }}>Quality preset{settings.preset === "custom" ? " (custom)" : ""}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {PRESET_LABELS.map((p) => (
                <button key={p.key} onClick={() => applyPreset(p.key)} style={chipStyle(settings.preset === p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="View distance"
            value={settings.renderDistance}
            min={RENDER_DISTANCE_RANGE.min}
            max={RENDER_DISTANCE_RANGE.max}
            step={1}
            display={`${settings.renderDistance * 32} blocks`}
            onChange={(renderDistance) => update({ renderDistance })}
          />
          <Slider
            label="Resolution"
            value={settings.resolution}
            min={RESOLUTION_RANGE.min}
            max={RESOLUTION_RANGE.max}
            step={0.25}
            display={`${Math.round(settings.resolution * 100)}%`}
            onChange={(resolution) => update({ resolution })}
          />
          <Slider
            label="Dynamic lights"
            value={settings.lights}
            min={LIGHTS_RANGE.min}
            max={LIGHTS_RANGE.max}
            step={1}
            display={settings.lights === 0 ? "off" : String(settings.lights)}
            onChange={(lights) => update({ lights })}
          />

          <div>
            <div style={{ marginBottom: 4, opacity: 0.8 }}>Clouds</div>
            <div style={{ display: "flex", gap: 4 }}>
              {CLOUD_OPTIONS.map((c) => (
                <button key={c.key} onClick={() => update({ clouds: c.key })} style={chipStyle(settings.clouds === c.key)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={settings.adaptive} onChange={(e) => update({ adaptive: e.target.checked })} />
            <span>Lower resolution automatically if the frame rate drops</span>
          </label>

          <div style={{ opacity: 0.6, fontSize: 10, lineHeight: 1.4 }}>
            Ultra ({PRESET_VALUES.ultra.renderDistance * 32}-block view) needs a fast GPU and plenty of memory. On a phone or an older laptop, stay on Low or Medium.
          </div>
        </div>
      )}
    </div>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ opacity: 0.8 }}>{props.label}</span>
        <span>{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ width: "100%", touchAction: "pan-y" }}
      />
    </div>
  );
}
