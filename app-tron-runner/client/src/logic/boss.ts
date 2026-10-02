// The Sentinel boss logic (SPEC §5.4) — pure TS, no three/DOM imports.
// Deterministic: everything is a function of the player's distance `dist`
// (m) and the set of collected core ids.

export const BOSS_Z0 = 6700;
export const BOSS_Z1 = 7800;
export const BOSS_SHATTER_Z = 7700;

export const TELEGRAPH_TIME = 1.0; // lane lights red for 1.0 s before firing
export const BOLT_SPEED = 70; // m/s toward the player
export const BOLT_SPAWN_AHEAD = 70; // bolt spawns ~70 m ahead of the player
export const BOLT_HIT_HEIGHT = 1.4; // airborne above this clears the bolt

export const CORE_Z = [6900, 7250, 7600] as const;
export const CORE_LANES: Array<-1 | 0 | 1> = [-1, 1, 0];

export interface BossPhase {
  index: 1 | 2 | 3;
  z0: number;
  z1: number;
  interval: number; // attack period in seconds
}

export const PHASES: BossPhase[] = [
  { index: 1, z0: 6700, z1: 7050, interval: 2.4 },
  { index: 2, z0: 7050, z1: 7400, interval: 2.0 },
  { index: 3, z0: 7400, z1: 7700, interval: 1.6 },
];

export function bossPhaseAt(dist: number): BossPhase | null {
  for (const p of PHASES) {
    if (dist >= p.z0 && dist < p.z1) return p;
  }
  return null;
}

export interface BossState {
  /** Core indices collected so far (determines overload). */
  coresCollected: number[];
  /** fireZ of the last attack that already fired (SFX dedupe). */
  lastFireZ: number;
}

export function createBossState(): BossState {
  return { coresCollected: [], lastFireZ: -Infinity };
}

/** True once all three cores have been collected (SENTINEL OVERLOAD). */
export function isOverloaded(state: BossState): boolean {
  return state.coresCollected.length >= CORE_Z.length;
}

/**
 * Attack interval (s) for the phase containing `dist`.
 * Overload halves the frequency in the last phase (phase 3).
 */
export function attackInterval(dist: number, state: BossState): number {
  const phase = bossPhaseAt(dist);
  if (!phase) return Infinity;
  if (phase.index === 3 && isOverloaded(state)) return phase.interval / 2;
  return phase.interval;
}

/**
 * Attack schedule: attacks are indexed by the number of metres travelled
 * inside the boss section, so the schedule is a pure function of distance
 * (deterministic regardless of speed).
 *
 * Attack `k` telegraphs at z = BOSS_Z0 + 20 + k·interval·30 and fires
 * TELEGRAPH_TIME later (in metres: TELEGRAPH_TIME × 30 m/s).
 */
const ATTACK_START_OFFSET = 20; // first attack telegraph 20 m into the section
const METERS_PER_SECOND = 30; // section speed, used to convert s → m

export interface Attack {
  index: number;
  telegraphZ: number; // dist where the telegraph begins
  fireZ: number; // dist where the bolt is fired (telegraphZ + 30 m)
  lanes: Array<-1 | 0 | 1>;
}

/**
 * All attacks with telegraphZ < dist (i.e. already telegraphed or fired).
 * Deterministic for a given `dist` and overload state.
 */
export function attacksBefore(dist: number, state: BossState): Attack[] {
  const attacks: Attack[] = [];
  if (dist <= BOSS_Z0 + ATTACK_START_OFFSET) return attacks;
  let z = BOSS_Z0 + ATTACK_START_OFFSET;
  let index = 0;
  while (z < dist) {
    const phase = bossPhaseAt(z);
    if (!phase) break;
    const interval = phase.index === 3 && isOverloaded(state)
      ? phase.interval / 2
      : phase.interval;
    const fireZ = z + TELEGRAPH_TIME * METERS_PER_SECOND;
    const lanes: Array<-1 | 0 | 1> = phase.index === 3 ? [-1, 1] : [phase.index === 1 ? 0 : (index % 2 === 0 ? -1 : 1)];
    attacks.push({ index, telegraphZ: z, fireZ, lanes });
    z += interval * METERS_PER_SECOND;
    index++;
  }
  return attacks;
}

/**
 * The attack currently telegraphing at `dist` (telegraph started, bolt not
 * yet fired), or null.
 */
export function activeTelegraph(dist: number, state: BossState): Attack | null {
  const attacks = attacksBefore(dist, state);
  for (let i = attacks.length - 1; i >= 0; i--) {
    const a = attacks[i];
    if (dist >= a.telegraphZ && dist < a.fireZ) return a;
  }
  return null;
}

/**
 * Impact distance: the bolt spawns BOLT_SPAWN_AHEAD m ahead at fire time and
 * travels toward the player at BOLT_SPEED m/s while the player runs at
 * METERS_PER_SECOND m/s, so closing speed is 100 m/s and the bolt meets the
 * player 0.7 s after firing, i.e. 21 m further along.
 */
export function boltImpactZ(a: Attack): number {
  return a.fireZ + (BOLT_SPAWN_AHEAD / (BOLT_SPEED + METERS_PER_SECOND)) * METERS_PER_SECOND;
}

/**
 * Bolt position (distance coordinate) at player distance `dist`, or null when
 * no bolt is in flight. The bolt is in flight while the player's dist is in
 * [fireZ, impactZ].
 */
export function boltPosition(dist: number, state: BossState): { z: number; lanes: Array<-1 | 0 | 1> } | null {
  if (dist >= BOSS_SHATTER_Z) return null;
  const attacks = attacksBefore(dist, state);
  for (let i = attacks.length - 1; i >= 0; i--) {
    const a = attacks[i];
    if (dist < a.fireZ) continue;
    const impact = boltImpactZ(a);
    if (dist > impact) continue; // already passed the player
    const t = (dist - a.fireZ) / METERS_PER_SECOND; // seconds since fire
    const z = a.fireZ + BOLT_SPAWN_AHEAD - BOLT_SPEED * t;
    return { z, lanes: a.lanes };
  }
  return null;
}

/**
 * Hit rule (SPEC §5.4): the player is hit if they are in a telegraphed lane
 * at impact and not airborne above BOLT_HIT_HEIGHT.
 */
export function boltHitsPlayer(
  dist: number,
  playerLane: number,
  playerY: number,
  state: BossState,
): boolean {
  if (dist >= BOSS_SHATTER_Z) return false;
  const attacks = attacksBefore(dist, state);
  for (let i = attacks.length - 1; i >= 0; i--) {
    const a = attacks[i];
    if (dist < a.fireZ || dist > boltImpactZ(a)) continue;
    if (playerY > BOLT_HIT_HEIGHT) return false;
    return a.lanes.some((l) => l === playerLane);
  }
  return false;
}

/** True once the player has passed the shatter point (boss explodes). */
export function bossShattered(dist: number): boolean {
  return dist >= BOSS_SHATTER_Z;
}

/**
 * Core at distance `z` (exact match within 0.5 m), or null.
 */
export function coreAt(z: number): { z: number; lane: -1 | 0 | 1; index: number } | null {
  for (let i = 0; i < CORE_Z.length; i++) {
    if (Math.abs(z - CORE_Z[i]) < 0.5) {
      return { z: CORE_Z[i], lane: CORE_LANES[i], index: i };
    }
  }
  return null;
}
