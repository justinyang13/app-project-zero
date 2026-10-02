import { createPlayerState, stepPlayer, applyHit, IDLE_ACTIONS, modeAt, CYCLE_JUMP_VELOCITY } from './player';
import type { PlayerActions, PlayerEnvironment, PlayerState } from './player';
import { SLIDE_DURATION } from '../config';

const DT = 1 / 120;

function makeEnv(overrides: Partial<PlayerEnvironment> = {}): PlayerEnvironment {
  return {
    isGapAt: () => false,
    wallStripAt: () => null,
    firstSolidFloorAfter: (z: number) => z + 1,
    speed: 24,
    mode: 'runner',
    ...overrides
  };
}

/** Step `seconds` of simulation; actions are applied on the first step only (edge-triggered). */
function run(state: PlayerState, actions: PlayerActions, seconds: number, env: PlayerEnvironment): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    stepPlayer(state, i === 0 ? actions : IDLE_ACTIONS, DT, env);
  }
}

describe('Player State Machine', () => {
  it('should have correct jump airtime and apex', () => {
    const state = createPlayerState();
    const env = makeEnv();

    // Press jump on the first step only.
    stepPlayer(state, { ...IDLE_ACTIONS, jump: true }, DT, env);

    // After one step: vy = 14 - 36/120 = 13.7, and the player is airborne.
    expect(state.vy).toBeGreaterThan(13);
    expect(state.vy).toBeLessThan(14);
    expect(state.isGrounded).toBe(false);

    // Step until the apex (vy <= 0) and check the apex height ≈ v0²/2g = 2.72 m.
    let apex = state.y;
    for (let i = 0; i < 200 && state.vy > 0; i++) {
      stepPlayer(state, IDLE_ACTIONS, DT, env);
      apex = Math.max(apex, state.y);
    }
    expect(apex).toBeCloseTo(2.7, 1);

    // Total airtime ≈ 2 * v0 / g = 0.78 s: player should be grounded again by then.
    for (let i = 0; i < 120; i++) stepPlayer(state, IDLE_ACTIONS, DT, env);
    expect(state.isGrounded).toBe(true);
    expect(state.y).toBe(0);
  });

  it('should handle lane change movement', () => {
    const state = createPlayerState();
    const env = makeEnv();

    // Press left once: lane (the target lane) is set immediately to -1.
    stepPlayer(state, { ...IDLE_ACTIONS, left: true }, DT, env);
    expect(state.lane).toBe(-1);
    expect(state.targetLane).toBe(-1);
    // x has started moving left but has not reached -3 yet.
    expect(state.x).toBeLessThan(0);
    expect(state.x).toBeGreaterThan(-3);

    // After ~0.25 s of idle steps, x should have converged to lane -1 (x = -3).
    run(state, IDLE_ACTIONS, 0.25, env);
    expect(state.x).toBeCloseTo(-3, 1);

    // Clamping: pressing left again at lane -1 stays at lane -1.
    stepPlayer(state, { ...IDLE_ACTIONS, left: true }, DT, env);
    expect(state.lane).toBe(-1);
  });

  it('should handle slide duration and reset', () => {
    const state = createPlayerState();
    const env = makeEnv();

    stepPlayer(state, { ...IDLE_ACTIONS, slide: true }, DT, env);
    expect(state.isSliding).toBe(true);
    expect(state.slideTimer).toBeCloseTo(SLIDE_DURATION, 1);

    // 80 idle steps = 0.667 s > 0.6 s slide duration.
    run(state, IDLE_ACTIONS, 80 * DT, env);
    expect(state.isSliding).toBe(false);
  });

  it('should handle gap fall integrity reduction exactly once', () => {
    const state = createPlayerState();
    // Gap spans z ∈ [100, 120]; respawn lands ahead at z = 95 (solid, player runs toward -Z).
    const env = makeEnv({
      isGapAt: (z: number) => z >= 100 && z <= 120,
      firstSolidFloorAfter: (z: number) => z - 10
    });

    // Start over the gap, below the fall threshold.
    state.z = 105;
    state.y = -0.5;

    stepPlayer(state, IDLE_ACTIONS, DT, env);

    // Lost exactly one integrity and respawned on solid floor.
    expect(state.integrity).toBe(2);
    expect(state.falling).toBe(true);
    expect(state.y).toBe(0);
    expect(state.x).toBe(0);
    expect(state.lane).toBe(0);
    expect(state.z).toBe(95);

    // Keep stepping: integrity must not drop again.
    run(state, IDLE_ACTIONS, 2, env);
    expect(state.integrity).toBe(2);
    expect(state.isGrounded).toBe(true);
  });

  it('should enter wall run only inside a strip from the matching outer lane', () => {
    const state = createPlayerState();
    const env = makeEnv({
      wallStripAt: (z: number, side: number) =>
        side === 1 && z >= 0 && z <= 100 ? { side: 1, z0: 0, z1: 100 } : null
    });

    // Position in lane 1 (x = 3) inside the strip's z range.
    state.lane = 1;
    state.targetLane = 1;
    state.x = 3;
    state.z = 50;

    // Press right (toward the strip) to start the wall entry transition.
    stepPlayer(state, { ...IDLE_ACTIONS, right: true }, DT, env);
    expect(state.isWallRunning).toBe(false); // still transitioning
    expect(state.wallSide).toBe(1);

    // After the 0.18 s transition the player is on the wall at x = 4.2, low row.
    run(state, IDLE_ACTIONS, 0.25, env);
    expect(state.isWallRunning).toBe(true);
    expect(state.x).toBeCloseTo(4.2, 1);
    expect(state.wallRow).toBe('low');

    // Row switch: jump -> high.
    stepPlayer(state, { ...IDLE_ACTIONS, jump: true }, DT, env);
    run(state, IDLE_ACTIONS, 0.25, env);
    expect(state.wallRow).toBe('high');
    expect(state.y).toBeCloseTo(4.8, 1);

    // Pressing away from the wall drops back to lane 1 (x = 3).
    stepPlayer(state, { ...IDLE_ACTIONS, left: true }, DT, env);
    run(state, IDLE_ACTIONS, 0.4, env);
    expect(state.isWallRunning).toBe(false);
    expect(state.x).toBeCloseTo(3, 1);
    expect(state.isGrounded).toBe(true);
  });

  it('should not enter wall run outside a strip', () => {
    const state = createPlayerState();
    const env = makeEnv(); // no strips at all
    state.lane = 1;
    state.targetLane = 1;
    state.x = 3;
    state.z = 50;

    stepPlayer(state, { ...IDLE_ACTIONS, right: true }, DT, env);
    run(state, IDLE_ACTIONS, 0.3, env);
    expect(state.isWallRunning).toBe(false);
    expect(state.x).toBeCloseTo(3, 1);
  });

  it('should disable slide and wall-run in cycle mode', () => {
    const state = createPlayerState();
    const env = makeEnv({
      mode: 'cycle',
      wallStripAt: (z: number, side: number) =>
        side === 1 && z >= 0 && z <= 100 ? { side: 1, z0: 0, z1: 100 } : null
    });

    // Slide is ignored in cycle mode.
    stepPlayer(state, { ...IDLE_ACTIONS, slide: true }, DT, env);
    expect(state.isSliding).toBe(false);

    // Wall entry is ignored in cycle mode.
    state.lane = 1;
    state.targetLane = 1;
    state.x = 3;
    state.z = 50;
    stepPlayer(state, { ...IDLE_ACTIONS, right: true }, DT, env);
    run(state, IDLE_ACTIONS, 0.3, env);
    expect(state.isWallRunning).toBe(false);
  });

  it('cycle hop uses v0 = 9 (airtime ≈ 0.5 s) and has no fast-fall', () => {
    const state = createPlayerState();
    const env = makeEnv({ mode: 'cycle' });
    stepPlayer(state, { ...IDLE_ACTIONS, jump: true }, DT, env);
    expect(state.vy).toBeCloseTo(CYCLE_JUMP_VELOCITY - 36 * DT, 3);
    // Airborne slide must NOT fast-fall in cycle mode.
    stepPlayer(state, { ...IDLE_ACTIONS, slide: true }, DT, env);
    expect(state.vy).toBeGreaterThan(-10);
    // Airtime ≈ 2·9/36 = 0.5 s.
    let t = DT;
    while (!state.isGrounded && t < 2) {
      stepPlayer(state, IDLE_ACTIONS, DT, env);
      t += DT;
    }
    expect(t).toBeGreaterThan(0.45);
    expect(t).toBeLessThan(0.55);
  });

  it('modeAt switches to cycle only inside section 4 (3700–5000)', () => {
    expect(modeAt(0)).toBe('runner');
    expect(modeAt(3699)).toBe('runner');
    expect(modeAt(3700)).toBe('cycle');
    expect(modeAt(4999)).toBe('cycle');
    expect(modeAt(5000)).toBe('runner');
    expect(modeAt(7800)).toBe('runner');
  });

  it('should apply hit: integrity -1, speed drop, invulnerability', () => {
    const state = createPlayerState();
    const env = makeEnv();

    state.integrity = 3;
    state.speedMultiplier = 1;
    state.invulnerabilityTimer = 0;

    applyHit(state);
    expect(state.integrity).toBe(2);
    expect(state.speedMultiplier).toBeCloseTo(0.65, 1);
    expect(state.invulnerabilityTimer).toBeGreaterThan(0);

    // A second hit during invulnerability is ignored.
    applyHit(state);
    expect(state.integrity).toBe(2);

    // Invulnerability decays over ~2 s and speed multiplier recovers to 1.
    run(state, IDLE_ACTIONS, 2.2, env);
    expect(state.invulnerabilityTimer).toBe(0);
    expect(state.speedMultiplier).toBeCloseTo(1, 1);
  });
});
