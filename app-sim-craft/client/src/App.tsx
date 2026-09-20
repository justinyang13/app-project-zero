import { useEffect, useRef, useState } from "react";
import { GameLoop } from "./engine/GameLoop";
import { setActiveGameLoop } from "./engine/activeGameLoop";
import { preloadFullMap } from "./engine/fullMapCache";
import { useGraphicsStore } from "./state/graphicsStore";
import { DebugOverlay } from "./ui/DebugOverlay";
import { Hotbar } from "./ui/Hotbar";
import { Crosshair } from "./ui/Crosshair";
import { Logo } from "./ui/Logo";
import { TimeControl } from "./ui/TimeControl";
import { VehiclePrompt } from "./ui/VehiclePrompt";
import { MiniMapPanel } from "./ui/MiniMapPanel";
import { MapSwitcher } from "./ui/MapSwitcher";
import { FullMap } from "./ui/FullMap";
import { WorldNameModal } from "./ui/WorldNameModal";
import { TouchControls } from "./ui/TouchControls";
import { TouchOverrideToggle } from "./ui/TouchOverrideToggle";
import { GraphicsPanel } from "./ui/GraphicsPanel";
import { finalizeWorldChoice, resolveActiveWorldId, validateWorldName, type WorldResolution } from "./persistence/migration";
import { useWorldStore } from "./state/worldStore";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  const [resolution, setResolution] = useState<WorldResolution | null>(null);
  const setWorldId = useWorldStore((s) => s.setWorldId);

  // Phase 1: figure out which world to load, without touching game state.
  useEffect(() => {
    let cancelled = false;
    void resolveActiveWorldId().then((result) => {
      if (!cancelled) setResolution(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const readyWorldId = resolution && !resolution.needsNaming ? resolution.worldId : null;

  useEffect(() => {
    if (readyWorldId) setWorldId(readyWorldId);
  }, [readyWorldId, setWorldId]);

  // Phase 2: once we know the world id, mount the actual game loop.
  useEffect(() => {
    if (!readyWorldId) return;
    const canvas = canvasRef.current;
    const minimapCanvas = minimapCanvasRef.current;
    if (!canvas || !minimapCanvas) return;

    let cancelled = false;
    let loop: GameLoop | null = null;
    let cancelPreload: (() => void) | null = null;
    // The render distance the player last chose (see ui/GraphicsPanel.tsx); the game loop keeps following changes after this.
    const renderDistanceColumns = useGraphicsStore.getState().settings.renderDistance;
    void GameLoop.create(canvas, minimapCanvas, readyWorldId, renderDistanceColumns).then((created) => {
      if (cancelled) {
        created.dispose();
        return;
      }
      loop = created;
      setActiveGameLoop(created);
      loop.start();
      cancelPreload = preloadFullMap(created.getMapSnapshot().seed);
    });

    return () => {
      cancelled = true;
      cancelPreload?.();
      setActiveGameLoop(null);
      loop?.dispose();
    };
  }, [readyWorldId]);

  async function handleNameConfirmed(slug: string) {
    if (!resolution || resolution.needsNaming === false) return;
    await finalizeWorldChoice(slug, resolution.legacyWorldId);
    setWorldId(slug);
    setResolution({ needsNaming: false, worldId: slug });
  }

  if (!resolution) return null;

  if (resolution.needsNaming) {
    return (
      <WorldNameModal
        title={resolution.legacyWorldId ? "Name your world" : "Welcome — name your world"}
        description={
          resolution.legacyWorldId
            ? "We found an existing save from before named worlds. Give it a name to keep it — nothing you've built will be lost."
            : "Pick a name for your new world. You can create more worlds later from the Maps panel."
        }
        initialValue={resolution.suggestedName}
        confirmLabel={resolution.legacyWorldId ? "Keep this world" : "Start playing"}
        validate={(raw) => validateWorldName(raw)}
        onConfirm={(slug) => void handleNameConfirmed(slug)}
      />
    );
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, display: "block", width: "100%", height: "var(--app-h, 100%)", touchAction: "none" }} />
      {/* The HUD lives in a box as tall as the usable screen (see viewportInsets.ts): the transform makes it the containing block for the fixed-position HUD pieces, so "bottom" means the top of Safari's toolbar rather than the bottom of the screen. */}
      <div id="hud" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "var(--app-h, 100%)", transform: "translateZ(0)", pointerEvents: "none" }}>
      <Crosshair />
      <Hotbar />
      <DebugOverlay />
      <Logo />
      <TimeControl />
      <VehiclePrompt />
      <MiniMapPanel canvasRef={minimapCanvasRef} />
      <MapSwitcher />
      <FullMap />
      <TouchControls />
      <TouchOverrideToggle />
      <GraphicsPanel />
      </div>
    </>
  );
}
