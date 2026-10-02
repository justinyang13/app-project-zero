import { JUMP_VELOCITY, GRAVITY, SLIDE_DURATION, COYOTE_TIME, MAX_INTEGRITY, SECTIONS } from '../config';

export type PlayerMode = 'runner' | 'cycle';

/**
 * Player mode at a distance (SPEC §4.4): the light-cycle segment is section 4
 * (LIGHT CYCLE HIGHWAY, 3700–5000 m). Transitions are automatic at the
 * section boundaries.
 */
export function modeAt(dist: number): PlayerMode {
  const i = SECTIONS.findIndex((s) => dist >= s.z0 && dist < s.z1);
  return i === 4 ? 'cycle' : 'runner';
}

export interface PlayerActions {
  left: boolean;
  right: boolean;
  jump: boolean;
  slide: boolean;
}

export const IDLE_ACTIONS: PlayerActions = { left: false, right: false, jump: false, slide: false };

export interface WallStrip {
  side: -1 | 1;
  z0: number;
  z1: number;
}

export interface PlayerEnvironment {
  isGapAt: (z: number) => boolean;
  wallStripAt: (z: number, side: number) => WallStrip | null;
  firstSolidFloorAfter: (z: number) => number;
  speed: number;
  mode: PlayerMode;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  lane: number;
  targetLane: number;
  isGrounded: boolean;
  isSliding: boolean;
  slideTimer: number;
  isWallRunning: boolean;
  wallSide: number;
  wallRow: 'low' | 'high';
  wallTransitionTimer: number;
  wallDropTimer: number;
  isJumping: boolean;
  coyoteTimer: number;
  integrity: number;
  speedMultiplier: number;
  invulnerabilityTimer: number;
  respawnTimer: number;
  falling: boolean;
  mode: PlayerMode;
}

export const WALL_X = 4.2;
export const WALL_LOW_Y = 1.6;
export const WALL_HIGH_Y = 4.8;
export const WALL_ENTRY_TIME = 0.18;
export const WALL_ROW_TIME = 0.15;
export const WALL_DROP_TIME = 0.3;
export const LANE_SMOOTH_TIME = 0.14;
export const FAST_FALL_VY = -22;
export const CYCLE_JUMP_VELOCITY = 9;

export function createPlayerState(): PlayerState {
  return {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    lane: 0,
    targetLane: 0,
    isGrounded: true,
    isSliding: false,
    slideTimer: 0,
    isWallRunning: false,
    wallSide: 0,
    wallRow: 'low',
    wallTransitionTimer: 0,
    wallDropTimer: 0,
    isJumping: false,
    coyoteTimer: 0,
    integrity: MAX_INTEGRITY,
    speedMultiplier: 1,
    invulnerabilityTimer: 0,
    respawnTimer: 0,
    falling: false,
    mode: 'runner'
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Apply a harmful hit: integrity -1, speed drop, combo reset, 2 s invulnerability. */
export function applyHit(state: PlayerState): void {
  if (state.invulnerabilityTimer > 0) return;
  state.integrity = Math.max(0, state.integrity - 1);
  state.speedMultiplier = 0.65;
  state.invulnerabilityTimer = 2.0;
}

export function stepPlayer(state: PlayerState, actions: PlayerActions, dt: number, env: PlayerEnvironment): void {
  state.mode = env.mode;

  // ---- Timers -------------------------------------------------------------
  if (state.invulnerabilityTimer > 0) state.invulnerabilityTimer = Math.max(0, state.invulnerabilityTimer - dt);
  if (state.respawnTimer > 0) state.respawnTimer = Math.max(0, state.respawnTimer - dt);
  if (state.coyoteTimer > 0) state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  if (state.speedMultiplier < 1.0) {
    state.speedMultiplier = Math.min(1.0, state.speedMultiplier + dt / 1.5);
  }

  // ---- Slide --------------------------------------------------------------
  if (actions.slide && state.mode === 'runner' && !state.isWallRunning && state.isGrounded && !state.falling) {
    state.isSliding = true;
    state.slideTimer = SLIDE_DURATION;
  }
  if (state.isSliding) {
    state.slideTimer -= dt;
    if (state.slideTimer <= 0) {
      state.isSliding = false;
      state.slideTimer = 0;
    }
  }

  // ---- Wall-run entry (runner only, grounded, outer lane, toward strip) ---
  if (
    state.mode === 'runner' &&
    !state.isWallRunning &&
    state.isGrounded &&
    !state.falling &&
    state.wallTransitionTimer <= 0 &&
    state.wallDropTimer <= 0
  ) {
    const toward = actions.right ? 1 : actions.left ? -1 : 0;
    if (toward !== 0 && state.lane === toward) {
      const strip = env.wallStripAt(state.z, toward);
      if (strip) {
        state.wallSide = toward;
        state.wallRow = 'low';
        state.wallTransitionTimer = WALL_ENTRY_TIME;
        state.isSliding = false;
        state.slideTimer = 0;
      }
    }
  }

  // ---- Wall entry transition ----------------------------------------------
  if (state.wallTransitionTimer > 0) {
    state.wallTransitionTimer = Math.max(0, state.wallTransitionTimer - dt);
    const targetX = state.wallSide * WALL_X;
    const targetY = WALL_LOW_Y;
    const t = 1 - Math.exp(-dt / (WALL_ENTRY_TIME / 3));
    state.x = lerp(state.x, targetX, t);
    state.y = lerp(state.y, targetY, t);
    if (state.wallTransitionTimer <= 0) {
      state.x = targetX;
      state.y = targetY;
      state.isWallRunning = true;
      state.isGrounded = false;
    }
    return;
  }

  // ---- Wall drop transition (leaving the wall) -----------------------------
  if (state.wallDropTimer > 0) {
    state.wallDropTimer = Math.max(0, state.wallDropTimer - dt);
    const targetX = state.wallSide * 3;
    const t = 1 - Math.exp(-dt / (WALL_DROP_TIME / 3));
    state.x = lerp(state.x, targetX, t);
    state.y = lerp(state.y, 0, t);
    if (state.wallDropTimer <= 0) {
      state.x = targetX;
      state.y = 0;
      state.isWallRunning = false;
      state.isGrounded = true;
      state.vy = 0;
    }
    return;
  }

  // ---- On the wall ----------------------------------------------------------
  if (state.isWallRunning) {
    const strip = env.wallStripAt(state.z, state.wallSide);
    const away = state.wallSide === 1 ? actions.left : actions.right;
    if (!strip || away) {
      // Drop back to the adjacent floor lane.
      state.wallDropTimer = WALL_DROP_TIME;
      return;
    }
    // Row switching: jump -> high, slide -> low (0.15 s transition).
    if (actions.jump && state.wallRow === 'low') {
      state.wallRow = 'high';
      state.wallTransitionTimer = WALL_ROW_TIME;
    } else if (actions.slide && state.wallRow === 'high') {
      state.wallRow = 'low';
      state.wallTransitionTimer = WALL_ROW_TIME;
    }
    if (state.wallTransitionTimer > 0) {
      state.wallTransitionTimer = Math.max(0, state.wallTransitionTimer - dt);
      const targetY = state.wallRow === 'high' ? WALL_HIGH_Y : WALL_LOW_Y;
      const t = 1 - Math.exp(-dt / (WALL_ROW_TIME / 3));
      state.y = lerp(state.y, targetY, t);
      if (state.wallTransitionTimer <= 0) state.y = targetY;
    } else {
      state.y = state.wallRow === 'high' ? WALL_HIGH_Y : WALL_LOW_Y;
    }
    state.x = state.wallSide * WALL_X;
    state.vy = 0;
    return;
  }

  // ---- Jump / fast-fall ------------------------------------------------------
  if (actions.jump && !state.falling) {
    if (state.isGrounded || state.coyoteTimer > 0) {
      const v0 = state.mode === 'cycle' ? CYCLE_JUMP_VELOCITY : JUMP_VELOCITY;
      state.vy = v0;
      state.isGrounded = false;
      state.isJumping = true;
      state.coyoteTimer = 0;
      state.isSliding = false;
      state.slideTimer = 0;
    } else if (state.isJumping && state.mode === 'runner') {
      // Pressing jump/slide while airborne = fast-fall.
      state.vy = FAST_FALL_VY;
    }
  }
  if (actions.slide && state.isJumping && state.mode === 'runner') {
    state.vy = FAST_FALL_VY;
  }

  // ---- Lane change (edge-triggered; lane is the target lane) ----------------
  if (!state.falling) {
    if (actions.left) state.lane = Math.max(-1, state.lane - 1);
    if (actions.right) state.lane = Math.min(1, state.lane + 1);
  }
  state.targetLane = state.lane;

  // ---- Gravity ---------------------------------------------------------------
  if (!state.isGrounded && !state.falling) {
    state.vy -= GRAVITY * dt;
  }

  // ---- Integrate ---------------------------------------------------------------
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  // Lane smoothing (exponential, ~0.14 s to converge).
  const targetX = state.lane * 3;
  if (Math.abs(state.x - targetX) > 0.001) {
    const t = 1 - Math.exp(-dt / (LANE_SMOOTH_TIME / 3));
    state.x = lerp(state.x, targetX, t);
  } else {
    state.x = targetX;
  }

  // ---- Gap fall ---------------------------------------------------------------
  if (state.y <= -0.3 && env.isGapAt(state.z) && !state.falling) {
    state.falling = true;
    state.integrity = Math.max(0, state.integrity - 1);
    state.respawnTimer = 0.8;
    state.invulnerabilityTimer = 2.0;
    // Teleport to the first solid floor point after the gap (ahead = -Z), center lane.
    state.z = env.firstSolidFloorAfter(state.z);
    state.x = 0;
    state.lane = 0;
    state.y = 0;
    state.vy = 0;
    state.isJumping = false;
    state.isSliding = false;
    state.slideTimer = 0;
  }

  // ---- Grounding ----------------------------------------------------------------
  if (state.respawnTimer > 0) {
    // Respawn fade: stay grounded at the respawn point.
    state.isGrounded = true;
    state.y = 0;
    state.vy = 0;
    if (state.respawnTimer <= 0) state.falling = false;
    return;
  }
  if (state.falling) state.falling = false;
  if (state.y <= 0) {
    if (env.isGapAt(state.z)) {
      // Over a gap: keep falling (fall check above handles the trigger).
      state.isGrounded = false;
    } else {
      state.y = 0;
      state.vy = 0;
      if (!state.isGrounded) state.coyoteTimer = COYOTE_TIME;
      state.isGrounded = true;
      state.isJumping = false;
    }
  }
}
