// A handle to the currently-running GameLoop for UI code (ui/MapSwitcher.tsx,
// ui/TouchJoystick.tsx, etc.) that needs to flush/dispose it before
// touching this world's IndexedDB rows out from under it — e.g. before a
// rename or a cloud save/load. Not game state itself (GameLoop remains
// the sole owner of that), just a pointer App.tsx sets/clears around the
// loop's lifetime.
import type { GameLoop } from "./GameLoop";

let current: GameLoop | null = null;

export function setActiveGameLoop(loop: GameLoop | null): void {
  current = loop;
}

export function getActiveGameLoop(): GameLoop | null {
  return current;
}
