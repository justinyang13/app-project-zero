// React binding for touch detection (see platform/touchMode.ts for the rules):
// gates every touch-only control (ui/TouchJoystick.tsx, TouchLookArea.tsx,
// TouchActionButtons.tsx, and the reflowed panels) behind one reactive value.
import { useEffect, useState } from "react";
import { isTouchDeviceNow, subscribeToTouchOverride, TOUCH_MEDIA_QUERY } from "../platform/touchMode";

/**
 * Re-evaluates on resize/orientation-change (a tablet could be docked
 * with an external mouse/keyboard mid-session, or undocked) and whenever
 * the override changes, not just once at mount.
 */
export function useIsTouchDevice(): boolean {
  const [value, setValue] = useState(isTouchDeviceNow);

  useEffect(() => {
    const recompute = () => setValue(isTouchDeviceNow());
    recompute();

    const mql = typeof window.matchMedia === "function" ? window.matchMedia(TOUCH_MEDIA_QUERY) : null;
    mql?.addEventListener("change", recompute);
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    const unsubscribe = subscribeToTouchOverride(recompute);

    return () => {
      mql?.removeEventListener("change", recompute);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
      unsubscribe();
    };
  }, []);

  return value;
}
