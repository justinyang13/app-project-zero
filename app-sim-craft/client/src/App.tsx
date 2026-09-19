import { useEffect, useRef, useState } from "react";
import { GameLoop } from "./engine/GameLoop";
import { setActiveGameLoop } from "./engine/activeGameLoop";
import { RENDER_DISTANCE_COLUMNS, MOBILE_RENDER_DISTANCE_COLUMNS } from "./engine/ChunkManager";
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
import { finalizeWorldChoice, resolveActiveWorldId, validateWorldName, type WorldResolution } from "./persistence/migration";
import { useWorldStore } from "./state/worldStore";
import { isTouchDeviceNow } from "./hooks/useIsTouchDevice";

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
    // Read once at creation time (not the live useIsTouchDevice() hook) —
    // this only needs to pick an initial render-distance budget, and
    // ChunkManager isn't built to have its radius change mid-session.
    const renderDistanceColumns = isTouchDeviceNow() ? MOBILE_RENDER_DISTANCE_COLUMNS : RENDER_DISTANCE_COLUMNS;
    void GameLoop.create(canvas, minimapCanvas, readyWorldId, renderDistanceColumns).then((created) => {
      if (cancelled) {
        created.dispose();
        return;
      }
      loop = created;
      setActiveGameLoop(created);
      loop.start();
    });

    return () => {
      cancelled = true;
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
      <canvas ref={canvasRef} style={{ display: "block", width: "100vw", height: "100vh" }} />
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
    </>
  );
}
