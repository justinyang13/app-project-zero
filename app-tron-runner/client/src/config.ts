export const DT = 1 / 120; // fixed timestep 120 Hz

// World units and coordinates
export const LANES = [-3, 0, 3]; // lane indices -1, 0, +1 at x = -3, 0, +3
export const LANE_COUNT = 3; // number of lanes (3 lanes: -1, 0, +1)
export const FLOOR_WIDTH = 9; // floor spans x ∈ [−4.5, 4.5]
export const FLOOR_HALF_WIDTH = 4.5;

// Player physics
export const GRAVITY = 36;
export const JUMP_VELOCITY = 14;
export const SLIDE_DURATION = 0.6;
export const COYOTE_TIME = 0.08;
export const SLIDE_JUMP_DELAY = 0.2;

// Sections and level data
export const LEVEL_LENGTH = 7800; // meters

export interface Section {
  name: string;
  z0: number;
  z1: number;
  speed: number;
  music: 'run' | 'boss';
}

export const SECTIONS: Section[] = [
  { name: 'BOOT SEQUENCE', z0: 0, z1: 400, speed: 20, music: 'run' },
  { name: 'CIRCUIT ALLEY', z0: 400, z1: 1500, speed: 24, music: 'run' },
  { name: 'WALL-RUN CANYON', z0: 1500, z1: 2600, speed: 26, music: 'run' },
  { name: 'DATA CHASM', z0: 2600, z1: 3700, speed: 28, music: 'run' },
  { name: 'LIGHT CYCLE HIGHWAY', z0: 3700, z1: 5000, speed: 36, music: 'boss' },
  { name: 'REINTEGRATION GAUNTLET', z0: 5000, z1: 6700, speed: 30, music: 'boss' },
  { name: 'THE SENTINEL', z0: 6700, z1: 7800, speed: 30, music: 'boss' }
];

export const TARGET_SCORE = 1500000;

// M14a: flip the realistic runner's facing if the GLB faces the wrong way.
// The reviewer toggles this after looking at the model in-game.
export const RUNNER_FACING_FLIP = true;
export const MAX_INTEGRITY = 3;

export const SPEEDS = SECTIONS.map(section => section.speed);

/** Section index containing distance z (clamped to the last section). */
export function sectionIndexAt(dist: number): number {
  for (let i = 0; i < SECTIONS.length; i++) {
    if (dist < SECTIONS[i].z1) return i;
  }
  return SECTIONS.length - 1;
}

/**
 * Speed (m/s) at distance z, eased over 40 m between sections (SPEC §5.1).
 * Pure and deterministic.
 */
export function sectionSpeedAt(dist: number): number {
  const i = sectionIndexAt(dist);
  const s = SECTIONS[i];
  const prev = i > 0 ? SECTIONS[i - 1] : null;
  const ease = 40;
  if (prev && dist < s.z0 + ease) {
    const t = (dist - s.z0) / ease;
    return prev.speed + (s.speed - prev.speed) * t;
  }
  return s.speed;
}

// Player collision box (SPEC §4.1)
export const PLAYER_WIDTH = 0.9;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_SLIDING_HEIGHT = 0.8;