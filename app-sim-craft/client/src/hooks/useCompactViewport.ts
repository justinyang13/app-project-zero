// True when the screen is short — a phone held sideways — so touch HUD
// pieces that stack vertically in portrait (hotbar above the thumb
// controls, the action-button column) can be re-arranged to fit.
import { useEffect, useState } from "react";

const COMPACT_HEIGHT = 520;

export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerHeight < COMPACT_HEIGHT);
  useEffect(() => {
    const recompute = () => setCompact(window.innerHeight < COMPACT_HEIGHT);
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, []);
  return compact;
}
