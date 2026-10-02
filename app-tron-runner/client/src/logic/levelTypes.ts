// Level data model (SPEC §5.2) — pure TS, no three/DOM imports.

export type Lane = -1 | 0 | 1;
export type WallSide = -1 | 1;
export type WallRow = 'low' | 'high';

export type ObstacleType =
  | 'barrier'
  | 'beam'
  | 'block'
  | 'gap'
  | 'longGap'
  | 'wallBlock'
  | 'drone'
  | 'laser'
  | 'rival'
  | 'boost'
  | 'bit'
  | 'core'
  | 'repair';

interface ObstacleBase {
  id: number;
  z: number; // distance start, positive metres
}

export interface Barrier extends ObstacleBase {
  type: 'barrier';
  lane: Lane;
}

export interface Beam extends ObstacleBase {
  type: 'beam';
  lane: Lane | 'all';
}

export interface Block extends ObstacleBase {
  type: 'block';
  lane: Lane;
}

export interface Gap extends ObstacleBase {
  type: 'gap';
  len: number; // 4–10 m
}

export interface LongGap extends ObstacleBase {
  type: 'longGap';
  len: number; // 24 m
}

export interface WallBlock extends ObstacleBase {
  type: 'wallBlock';
  side: WallSide;
  row: WallRow;
  len: number; // 6–10 m
}

export interface Drone extends ObstacleBase {
  type: 'drone';
  lane: Lane;
  phase: number; // sine phase, radians
  period: number; // seconds, 2.4
}

export interface Laser extends ObstacleBase {
  type: 'laser';
  phase: number; // on/off cycle phase, seconds
}

export interface Rival extends ObstacleBase {
  type: 'rival';
  lane: Lane;
  speedFactor: number; // 0.6 of player speed
}

export interface Boost extends ObstacleBase {
  type: 'boost';
  lane: Lane;
}

export interface Bit extends ObstacleBase {
  type: 'bit';
  lane: Lane;
  y: number; // height above floor (0 = ground)
}

export interface Core extends ObstacleBase {
  type: 'core';
  lane: Lane;
}

export interface Repair extends ObstacleBase {
  type: 'repair';
  lane: Lane;
}

export type Obstacle =
  | Barrier
  | Beam
  | Block
  | Gap
  | LongGap
  | WallBlock
  | Drone
  | Laser
  | Rival
  | Boost
  | Bit
  | Core
  | Repair;

export interface WallStrip {
  side: WallSide;
  z0: number;
  z1: number;
}

export interface Level {
  length: number;
  seed: number;
  obstacles: Obstacle[]; // sorted by z
  wallStrips: WallStrip[]; // sorted by z0
}

/** Obstacles whose z lies in [z0, z1). */
export function obstaclesInRange(level: Level, z0: number, z1: number): Obstacle[] {
  const out: Obstacle[] = [];
  for (const o of level.obstacles) {
    if (o.z >= z0 && o.z < z1) out.push(o);
  }
  return out;
}

/** Bits whose z lies in [z0, z1). */
export function bitsInRange(level: Level, z0: number, z1: number): Bit[] {
  return obstaclesInRange(level, z0, z1).filter((o): o is Bit => o.type === 'bit');
}

/** True if the floor is missing at distance z (gap or longGap). */
export function isGapAt(level: Level, z: number): boolean {
  for (const o of level.obstacles) {
    if ((o.type === 'gap' || o.type === 'longGap') && z >= o.z && z < o.z + o.len) return true;
  }
  return false;
}

/** First solid floor distance at or after z (z itself if solid). */
export function firstSolidFloorAfter(level: Level, z: number): number {
  for (const o of level.obstacles) {
    if (o.type === 'gap' || o.type === 'longGap') {
      if (z >= o.z && z < o.z + o.len) return o.z + o.len;
    }
  }
  return z;
}

/** Wall strip covering z on the given side, or null. */
export function wallStripAt(level: Level, z: number, side: WallSide): WallStrip | null {
  for (const s of level.wallStrips) {
    if (s.side === side && z >= s.z0 && z < s.z1) return s;
  }
  return null;
}

/** All wall strips covering z (either side). */
export function wallStripsAt(level: Level, z: number): WallStrip[] {
  const out: WallStrip[] = [];
  for (const s of level.wallStrips) {
    if (z >= s.z0 && z < s.z1) out.push(s);
  }
  return out;
}

/** z-interval [start, end) of a harmful obstacle (for overlap checks). */
export function obstacleSpan(o: Obstacle): [number, number] {
  switch (o.type) {
    case 'barrier':
      return [o.z, o.z + 0.6];
    case 'beam':
      return [o.z, o.z + 0.5];
    case 'block':
      return [o.z, o.z + 1.2];
    case 'gap':
    case 'longGap':
      return [o.z, o.z + o.len];
    case 'wallBlock':
      return [o.z, o.z + o.len];
    case 'drone':
      return [o.z, o.z + 1.6];
    case 'laser':
      return [o.z, o.z + 0.3];
    case 'rival':
      return [o.z, o.z + 2.2];
    default:
      return [o.z, o.z + 0.5];
  }
}
