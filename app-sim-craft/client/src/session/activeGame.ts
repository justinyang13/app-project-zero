// The narrow surface the UI is allowed to drive the running game through, and
// the handle to whichever game is currently running. The UI never sees the
// engine's classes: App.tsx registers the game here (any object that fits
// GameCommands will do — GameLoop does structurally), and UI code asks for it
// when it needs to act. Not game state itself, just a pointer set/cleared
// around the game's lifetime.
import type { MapSnapshot } from "../map/MapSnapshot";

export interface GameCommands {
  /** The E key's action: get on/off a car or mount. */
  interact(): void;
  /** Double-tap Space's action: start flying / turbo, or nitro / turbo on a mount. */
  toggleFlying(): void;
  toggleViewMode(): void;
  teleportToCastle(): void;
  /** The current build mode's action (break / place / torch / flag); pass `isRepeat` for held-button repeats. */
  triggerPrimaryAction(isRepeat?: boolean): void;
  setPrimaryActionHeld(held: boolean): void;
  /** A raw touch-drag pixel delta, fed through the same yaw/pitch math mouse-look uses. */
  applyTouchLookDelta(deltaX: number, deltaY: number): void;
  /** The joystick's {x, y} in right/forward shape, on every drag/release. */
  setTouchMoveVector(x: number, y: number): void;
  setTouchJump(held: boolean): void;
  getMapSnapshot(): MapSnapshot;
  /** Awaits a full save — for anything about to touch this world's stored data. */
  flushAll(): Promise<void>;
  dispose(): void;
}

let current: GameCommands | null = null;

export function setActiveGame(game: GameCommands | null): void {
  current = game;
}

export function getActiveGame(): GameCommands | null {
  return current;
}
