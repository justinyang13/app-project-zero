import { useEffect, useRef } from "react";
import { GameLoop } from "./engine/GameLoop";
import { DebugOverlay } from "./ui/DebugOverlay";
import { Hotbar } from "./ui/Hotbar";
import { Crosshair } from "./ui/Crosshair";
import { Logo } from "./ui/Logo";
import { TimeControl } from "./ui/TimeControl";
import { VehiclePrompt } from "./ui/VehiclePrompt";
import { MiniMapPanel } from "./ui/MiniMapPanel";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const minimapCanvas = minimapCanvasRef.current;
    if (!canvas || !minimapCanvas) return;

    let cancelled = false;
    let loop: GameLoop | null = null;
    void GameLoop.create(canvas, minimapCanvas).then((created) => {
      if (cancelled) {
        created.dispose();
        return;
      }
      loop = created;
      loop.start();
    });

    return () => {
      cancelled = true;
      loop?.dispose();
    };
  }, []);

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
    </>
  );
}
