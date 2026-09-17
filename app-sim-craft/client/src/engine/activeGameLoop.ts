// A handle to the currently-running GameLoop for UI code (MapSwitcher,
// CloudSync) that needs to flush/dispose it before touching this world's
// IndexedDB rows out from under it — e.g. before a rename or a cloud
// pull. Not game state itself (GameLoop remains the sole owner of that),
// just a pointer App.tsx sets/clears around the loop's lifetime.
import type { GameLoop } from "./GameLoop";

let current: GameLoop | null = null;

export function setActiveGameLoop(loop: GameLoop | null): void {
  current = loop;
}

export function getActiveGameLoop(): GameLoop | null {
  return current;
}
