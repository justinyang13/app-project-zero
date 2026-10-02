import type { PlayerState } from './player';

/**
 * M14a: pure animation-state → clip mapping for the realistic runner GLB.
 * No three.js imports — fully unit-testable.
 */

export type ClipName =
  | 'Sprint_Loop'
  | 'Idle_Loop'
  | 'Jump_Start'
  | 'Jump_Loop'
  | 'Jump_Land'
  | 'Slide_Start'
  | 'Slide_Loop'
  | 'Slide_Exit'
  | 'Hit_Chest'
  | 'Death01'
  | 'Dance_Loop';

/** What the runner was doing on the previous frame (mixer bookkeeping). */
export interface ClipState {
  clip: ClipName;
  /** Seconds elapsed in the current clip (at timeScale 1). */
  time: number;
  oneShot: boolean;
  oneShotThen: ClipName | null;
  /** True while the Hit_Chest overlay is playing. */
  hitOverlay: boolean;
}

export interface ClipChoice {
  clip: ClipName;
  loop: boolean;
  timeScale: number;
  fade: number;
  /** For one-shots: the clip to cross-fade back to when this one finishes. */
  oneShotThen?: ClipName;
}

export const INITIAL_CLIP_STATE: ClipState = {
  clip: 'Idle_Loop',
  time: 0,
  oneShot: false,
  oneShotThen: null,
  hitOverlay: false
};

/** Extra context the pure PlayerState does not carry (game phase). */
export interface AnimContext {
  phase?: 'idle' | 'victory';
}

const FADE = 0.12;
const HIT_FADE = 0.05;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function sprintTimeScale(speed: number): number {
  return clamp(speed / 24, 0.8, 1.6);
}

/**
 * Decide which clip to play given the player state, current speed and the
 * previous clip bookkeeping. Deterministic and pure.
 */
export function chooseClip(
  state: PlayerState,
  speed: number,
  prev: ClipState,
  ctx: AnimContext = {}
): ClipChoice {
  // Death always wins.
  if (state.integrity <= 0) {
    return { clip: 'Death01', loop: false, timeScale: 1, fade: FADE };
  }

  // Hit overlay: invulnerability just started (timer near its 2.0 s max).
  if (!prev.hitOverlay && state.invulnerabilityTimer > 1.9) {
    return {
      clip: 'Hit_Chest',
      loop: false,
      timeScale: 1,
      fade: HIT_FADE,
      oneShotThen: prev.clip
    };
  }

  if (ctx.phase === 'victory') {
    return { clip: 'Dance_Loop', loop: true, timeScale: 1, fade: FADE };
  }
  if (ctx.phase === 'idle' || speed < 0.5) {
    return { clip: 'Idle_Loop', loop: true, timeScale: 1, fade: FADE };
  }

  // Wall-run: keep sprinting (the outer group carries the 90° rotation).
  if (state.isWallRunning) {
    return { clip: 'Sprint_Loop', loop: true, timeScale: sprintTimeScale(speed), fade: FADE };
  }

  // Sliding.
  if (state.isSliding) {
    if (prev.clip !== 'Slide_Start' && prev.clip !== 'Slide_Loop') {
      return { clip: 'Slide_Start', loop: false, timeScale: 1, fade: FADE, oneShotThen: 'Slide_Loop' };
    }
    if (prev.clip === 'Slide_Start') {
      return { clip: 'Slide_Loop', loop: true, timeScale: 1, fade: FADE };
    }
    return { clip: 'Slide_Loop', loop: true, timeScale: 1, fade: FADE };
  }
  // Slide just ended.
  if (prev.clip === 'Slide_Loop' || prev.clip === 'Slide_Start') {
    return { clip: 'Slide_Exit', loop: false, timeScale: 1, fade: FADE, oneShotThen: 'Sprint_Loop' };
  }

  // Jump start: just left the ground while rising.
  if (!state.isGrounded && state.vy > 0 && prev.clip !== 'Jump_Start' && prev.clip !== 'Jump_Loop') {
    return { clip: 'Jump_Start', loop: false, timeScale: 1.6, fade: FADE, oneShotThen: 'Jump_Loop' };
  }
  // Airborne (rising after Jump_Start, or falling).
  if (!state.isGrounded) {
    return { clip: 'Jump_Loop', loop: true, timeScale: 1, fade: FADE };
  }

  // Landing: was airborne, now grounded.
  if (prev.clip === 'Jump_Start' || prev.clip === 'Jump_Loop') {
    return { clip: 'Jump_Land', loop: false, timeScale: 2.2, fade: FADE, oneShotThen: 'Sprint_Loop' };
  }

  // Default: running.
  return { clip: 'Sprint_Loop', loop: true, timeScale: sprintTimeScale(speed), fade: FADE };
}
