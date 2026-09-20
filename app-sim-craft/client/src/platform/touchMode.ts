// The non-React half of touch detection. Gates every touch-only control (ui/TouchJoystick.tsx, TouchLookArea.tsx,
// TouchActionButtons.tsx, and the reflowed panels in Part D) behind a
// single detection result. "Real touch" means (hover: none) and
// (pointer: coarse) — NOT just touch-event support — so a touchscreen
// laptop with a mouse attached still gets desktop controls (its primary
// pointer is a fine, hover-capable mouse). A manual override persisted in
// localStorage (a per-viewer convenience, outside the primary IndexedDB
// world state) wins over detection, in case it ever misfires on an odd
// device.
export const TOUCH_MEDIA_QUERY = "(hover: none) and (pointer: coarse)";
const OVERRIDE_KEY = "simcraft:touchControlsOverride";

export type TouchOverride = "touch" | "desktop" | null;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Runs `listener` whenever the manual override changes in this tab; returns the unsubscribe. */
export function subscribeToTouchOverride(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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

/** One-off, non-reactive read — for plain (non-React) call sites, e.g. the graphics store's initial mobile preset. */
export function isTouchDeviceNow(): boolean {
  return resolveTouchMode(detectMatches(), readOverride());
}
