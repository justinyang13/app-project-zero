// Turns raw browser input (keyboard, mouse, wheel) plus the touch controls'
// state into the two things the game consumes: per-step movement input and
// discrete game actions. Desktop and touch are two *sources* feeding the same
// state — on desktop the touch fields never leave their zero/false defaults,
// so merging them is inert. What each key does lives in the ON_PRESS table
// below, so adding a hotkey is one line.
import type { PlayerInput } from "../engine/Player";
import type { RideInput } from "../entities/Rideable";
import { HOTBAR_SLOTS, useHotbarStore } from "../state/hotbarStore";
import { useHudStore } from "../state/hudStore";
import { useMinimapStore } from "../state/minimapStore";

/** The discrete things input can ask the game to do. */
export interface GameActions {
  interact(): void;
  toggleFlying(): void;
  toggleViewMode(): void;
  teleportToCastle(): void;
  toggleMarkerAtPlayer(): void;
  /** Left click / the touch action button, on press (held repeats are driven by `primaryActionHeld`). */
  primaryAction(): void;
  /** Right click: the quick block-place shortcut. */
  secondaryAction(): void;
  wheel(deltaY: number): void;
}

const DOUBLE_TAP_MS = 300;

// Space's browser default is page-scroll, which would visibly yank the canvas out of view the moment
// the player tries to jump; F3/F5 default to find/refresh, which would lose the session's in-memory state.
const PREVENT_DEFAULT_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "Space",
  "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "F3", "F5",
]);

type PressHandler = (actions: GameActions) => void;

// Fired once per physical key press (browser key-repeat is ignored).
const ON_PRESS: Record<string, PressHandler> = {
  // Full-screen map: a non-blocking overlay (ui/FullMap.tsx), so the player keeps moving underneath.
  KeyM: () => useMinimapStore.getState().toggleFullMap(),
  Escape: () => useMinimapStore.getState().closeFullMap(),
  F3: () => useHudStore.getState().toggleDebug(),
  F5: (actions) => actions.toggleViewMode(),
  KeyB: () => useHotbarStore.getState().cycleMode(),
  // Direct mode hotkeys alongside B's cycle — Z/X/C/V mirrors the Hotbar's Break/Build/Torch/Flag button order (see ui/Hotbar.tsx).
  KeyZ: () => useHotbarStore.getState().setMode("break"),
  KeyX: () => useHotbarStore.getState().setMode("place"),
  KeyC: () => useHotbarStore.getState().setMode("torch"),
  KeyV: () => useHotbarStore.getState().setMode("flag"),
  KeyE: (actions) => actions.interact(),
  KeyH: (actions) => actions.teleportToCastle(),
  KeyK: (actions) => actions.toggleMarkerAtPlayer(),
  Minus: () => useMinimapStore.getState().zoomOut(),
  Equal: () => useMinimapStore.getState().zoomIn(),
};

function clamp1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

export class InputManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly actions: GameActions;
  private readonly pressed = new Set<string>();
  private lastSpaceTapTime = 0;
  private touchMove = { x: 0, y: 0 };
  private touchJumpHeld = false;
  private held = false;

  constructor(canvas: HTMLCanvasElement, actions: GameActions) {
    this.canvas = canvas;
    this.actions = actions;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    // On window, not canvas — releasing the button after dragging off the canvas (or off-screen
    // entirely) must still stop a held action from repeating forever.
    window.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("contextmenu", this.handleContextMenu);
    canvas.addEventListener("wheel", this.handleWheel);
  }

  /** Whether the primary action (left mouse / the touch action button) is currently held — every mode repeats its action while it is. */
  get primaryActionHeld(): boolean {
    return this.held;
  }

  /** Touch counterpart to mouse-up/down — see ui/TouchActionButtons.tsx's primary action button. */
  setPrimaryActionHeld(held: boolean): void {
    this.held = held;
  }

  /** {x, y} already in walkInput()'s right/forward shape (see touchMath.ts's computeJoystickVector) — the touch joystick sets this on every drag/release. */
  setTouchMoveVector(x: number, y: number): void {
    this.touchMove = { x, y };
  }

  setTouchJump(held: boolean): void {
    this.touchJumpHeld = held;
  }

  private axis(positive: string, negative: string): number {
    return (this.pressed.has(positive) ? 1 : 0) - (this.pressed.has(negative) ? 1 : 0);
  }

  /** Movement input for the on-foot physics step. */
  walkInput(): PlayerInput {
    const jump = this.pressed.has("Space") || this.touchJumpHeld;
    return {
      forward: clamp1(this.axis("KeyW", "KeyS") + this.touchMove.y),
      right: clamp1(this.axis("KeyD", "KeyA") + this.touchMove.x),
      jump,
      sprint: this.pressed.has("ControlLeft") || this.pressed.has("ControlRight"),
      flyUp: jump,
      flyDown: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
    };
  }

  /** Steering input for whatever the player is riding or driving. */
  rideInput(): RideInput {
    const up = this.pressed.has("Space") || this.touchJumpHeld ? 1 : 0;
    // Same up/down keys as free flight: Space climbs, Shift (or Ctrl) descends.
    const down =
      this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight") || this.pressed.has("ControlLeft") || this.pressed.has("ControlRight") ? 1 : 0;
    return {
      throttle: clamp1(this.axis("KeyW", "KeyS") + this.touchMove.y),
      steer: clamp1(this.axis("KeyD", "KeyA") + this.touchMove.x),
      climb: up - down,
    };
  }

  /** Arrow keys pan the view — a keyboard alternative to mouse-look, since Pointer Lock is unreliable across browsers/embeds. */
  panAxes(): { yaw: number; pitch: number } {
    return { yaw: this.axis("ArrowRight", "ArrowLeft"), pitch: this.axis("ArrowUp", "ArrowDown") };
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (PREVENT_DEFAULT_KEYS.has(e.code)) e.preventDefault();
    this.pressed.add(e.code);
    if (e.repeat) return;

    ON_PRESS[e.code]?.(this.actions);

    if (e.code === "Space") {
      // Double-tap Space: fly on the ground, turbo in the air, nitro in a car — see GameActions.toggleFlying.
      const now = performance.now();
      if (now - this.lastSpaceTapTime < DOUBLE_TAP_MS) this.actions.toggleFlying();
      this.lastSpaceTapTime = now;
    }
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= HOTBAR_SLOTS.length) useHotbarStore.getState().select(n - 1);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code);
  };

  // A key released while the window wasn't focused never reports its keyup — forget everything held.
  private handleBlur = (): void => {
    this.pressed.clear();
    this.held = false;
  };

  // Deliberately not gated on Pointer Lock — mining/placing must keep working even if it fails to engage
  // (it's finicky across browsers/embeds), so mouse-look is a bonus on top of building, never a prerequisite.
  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.held = true;
      this.actions.primaryAction();
    } else if (e.button === 2) {
      this.actions.secondaryAction();
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.held = false;
  };

  private handleContextMenu = (e: Event): void => e.preventDefault();

  private handleWheel = (e: WheelEvent): void => this.actions.wheel(e.deltaY);
}
