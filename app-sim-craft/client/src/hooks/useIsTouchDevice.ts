// Gates every touch-only control (ui/TouchJoystick.tsx, TouchLookArea.tsx,
// TouchActionButtons.tsx, and the reflowed panels in Part D) behind a
// single detection result. "Real touch" means (hover: none) and
// (pointer: coarse) — NOT just touch-event support — so a touchscreen
// laptop with a mouse attached still gets desktop controls (its primary
// pointer is a fine, hover-capable mouse). A manual override persisted in
// localStorage (a per-viewer convenience, outside the primary IndexedDB
// world state) wins over detection, in case it ever misfires on an odd
// device.
import { useEffect, useState } from "react";

const TOUCH_MEDIA_QUERY = "(hover: none) and (pointer: coarse)";
const OVERRIDE_KEY = "simcraft:touchControlsOverride";

export type TouchOverride = "touch" | "desktop" | null;

type Listener = () => void;
const listeners = new Set<Listener>();

function readOverride(): TouchOverride {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw === "touch" || raw === "desktop" ? raw : null;
  } catch {
    return null;
  }
}

export function getTouchOverride(): TouchOverride {
  return readOverride();
}

/** Sets (or clears, with null) the manual override and notifies every mounted useIsTouchDevice() hook in this tab immediately — a same-tab localStorage write doesn't fire the browser's own "storage" event, only other tabs get that. */
export function setTouchOverride(value: TouchOverride): void {
  try {
    if (value === null) localStorage.removeItem(OVERRIDE_KEY);
    else localStorage.setItem(OVERRIDE_KEY, value);
  } catch {
    // Per-viewer convenience only — non-fatal if storage is unavailable.
  }
  for (const listener of listeners) listener();
}

function detectMatches(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(TOUCH_MEDIA_QUERY).matches;
}

/** Pure decision logic, exported standalone so it's unit-testable without mocking React or the DOM. The override wins if set; otherwise the media-query result. */
export function resolveTouchMode(matches: boolean, override: TouchOverride): boolean {
  if (override === "touch") return true;
  if (override === "desktop") return false;
  return matches;
}

/** One-off, non-reactive read — for plain (non-React) call sites, e.g. GameLoop's initial mobile render-distance choice at creation time. */
export function isTouchDeviceNow(): boolean {
  return resolveTouchMode(detectMatches(), readOverride());
}

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
    listeners.add(recompute);

    return () => {
      mql?.removeEventListener("change", recompute);
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
      listeners.delete(recompute);
    };
  }, []);

  return value;
}
