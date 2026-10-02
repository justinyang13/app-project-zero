// Collision detection between the player and level obstacles (SPEC §5.2).
// Pure TS, no three/DOM imports. Deterministic.

import type { PlayerState } from './player';
import type { Level } from './levelTypes';
import { obstaclesInRange } from './levelTypes';
import { droneX, DRONE_Y, DRONE_RADIUS, laserState, LASER_Y1, LASER_Y0_HARMFUL } from './timed';

export interface PlayerBox {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number; // 1.8 standing, 0.8 sliding
}

/** Build the player's AABB from its state (centered on x, standing on y). */
export function playerBox(state: PlayerState): PlayerBox {
  return { x: state.x, y: state.y, w: 0.9, d: 0.9, h: state.isSliding ? 0.8 : 1.8 };
}

export type CollisionEvent =
  | { kind: 'hit'; obstacleId: number }
  | { kind: 'nearMiss'; obstacleId: number }
  | { kind: 'bit'; id: number }
  | { kind: 'repair'; id: number }
  | { kind: 'boost'; id: number }
  | { kind: 'core'; id: number };

export interface CollisionCtx {
  /** Obstacle ids that already produced a near-miss event. */
  nearMissed: Set<number>;
  /** Pickup ids already collected. */
  collected: Set<number>;
  /** Run time in seconds (drives drone patrol + laser schedule). */
  time: number;
}

export function createCollisionCtx(): CollisionCtx {
  return { nearMissed: new Set<number>(), collected: new Set<number>(), time: 0 };
}

const LANE_X = 3;
const HALF_W = 0.45; // player half width
const HALF_LANE = 1.5; // half of a 3 m lane
const NEAR_MISS_MARGIN = 0.5;

function laneX(lane: number): number {
  return lane * LANE_X;
}

function zOverlap(oStart: number, oEnd: number, pStart: number, pEnd: number): boolean {
  return oStart < pEnd && oEnd > pStart;
}

/** Lateral gap (m) between the player box edge and the obstacle lane edge. Negative = overlapping. */
function lateralGap(playerX: number, obstacleLaneX: number): number {
  return Math.abs(playerX - obstacleLaneX) - (HALF_LANE + HALF_W);
}

/** Sphere (pickup) vs player box, with the player's z treated as the segment [pStart, pEnd]. */
function sphereHitsBox(
  cx: number,
  cy: number,
  cz: number,
  box: PlayerBox,
  pStart: number,
  pEnd: number,
  radius: number
): boolean {
  if (cz < pStart - radius || cz > pEnd + radius) return false;
  const dx = Math.max(Math.abs(cx - box.x) - HALF_W, 0);
  const dy = Math.max(Math.abs(cy - (box.y + box.h / 2)) - box.h / 2, 0);
  const dz = Math.max(Math.abs(cz - (pStart + pEnd) / 2) - (pEnd - pStart) / 2, 0);
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}

/**
 * Check the player's step [prevDist, dist] against the level.
 * Returns typed events (hits, near misses, pickups). gap/longGap are handled by
 * player.ts; drone/laser/wallBlock are time-deterministic via ctx.time.
 */
export function checkCollisions(
  state: PlayerState,
  prevDist: number,
  dist: number,
  level: Level,
  ctx: CollisionCtx
): CollisionEvent[] {
  const events: CollisionEvent[] = [];
  const box = playerBox(state);
  const pStart = prevDist - HALF_W;
  const pEnd = dist + HALF_W;
  const invulnerable = state.invulnerabilityTimer > 0;

  const obstacles = obstaclesInRange(level, prevDist - 2, dist + 2);
  for (const o of obstacles) {
    switch (o.type) {
      case 'barrier': {
        if (!zOverlap(o.z, o.z + 0.6, pStart, pEnd)) break;
        const ox = laneX(o.lane);
        const inLane = lateralGap(box.x, ox) < 0;
        const harmful = inLane && box.y < 1.0;
        if (harmful) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
          break;
        }
        if (!ctx.nearMissed.has(o.id)) {
          const gap = lateralGap(box.x, ox);
          if (gap >= 0 && gap <= NEAR_MISS_MARGIN) {
            ctx.nearMissed.add(o.id);
            events.push({ kind: 'nearMiss', obstacleId: o.id });
          }
        }
        break;
      }
      case 'beam': {
        if (!zOverlap(o.z, o.z + 0.5, pStart, pEnd)) break;
        const ox = o.lane === 'all' ? box.x : laneX(o.lane);
        const inLane = o.lane === 'all' || lateralGap(box.x, ox) < 0;
        const harmful = inLane && box.y + box.h > 1.1;
        if (harmful) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
          break;
        }
        if (o.lane !== 'all' && !ctx.nearMissed.has(o.id)) {
          const gap = lateralGap(box.x, ox);
          if (gap >= 0 && gap <= NEAR_MISS_MARGIN) {
            ctx.nearMissed.add(o.id);
            events.push({ kind: 'nearMiss', obstacleId: o.id });
          }
        }
        break;
      }
      case 'block': {
        if (!zOverlap(o.z, o.z + 1.2, pStart, pEnd)) break;
        const ox = laneX(o.lane);
        const inLane = lateralGap(box.x, ox) < 0;
        const harmful = inLane && box.y < 3;
        if (harmful) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
          break;
        }
        if (!ctx.nearMissed.has(o.id)) {
          const gap = lateralGap(box.x, ox);
          if (gap >= 0 && gap <= NEAR_MISS_MARGIN) {
            ctx.nearMissed.add(o.id);
            events.push({ kind: 'nearMiss', obstacleId: o.id });
          }
        }
        break;
      }
      case 'bit': {
        if (ctx.collected.has(o.id)) break;
        if (sphereHitsBox(laneX(o.lane), o.y, o.z, box, pStart, pEnd, 0.35)) {
          ctx.collected.add(o.id);
          events.push({ kind: 'bit', id: o.id });
        }
        break;
      }
      case 'core': {
        if (ctx.collected.has(o.id)) break;
        if (sphereHitsBox(laneX(o.lane), 1.0, o.z, box, pStart, pEnd, 0.6)) {
          ctx.collected.add(o.id);
          events.push({ kind: 'core', id: o.id });
        }
        break;
      }
      case 'repair': {
        if (ctx.collected.has(o.id)) break;
        if (sphereHitsBox(laneX(o.lane), 1.0, o.z, box, pStart, pEnd, 0.8)) {
          ctx.collected.add(o.id);
          events.push({ kind: 'repair', id: o.id });
        }
        break;
      }
      case 'boost': {
        if (ctx.collected.has(o.id)) break;
        if (sphereHitsBox(laneX(o.lane), 0.3, o.z, box, pStart, pEnd, 0.8)) {
          ctx.collected.add(o.id);
          events.push({ kind: 'boost', id: o.id });
        }
        break;
      }
      case 'drone': {
        // Sine patrol: x = 3·sin(2πt/period + phase), hovers at y = 0.9, r = 0.8.
        if (!zOverlap(o.z, o.z + 1.6, pStart, pEnd)) break;
        const ox = droneX(o, ctx.time);
        const dx = Math.max(Math.abs(ox - box.x) - HALF_W, 0);
        const dy = Math.max(Math.abs(DRONE_Y - (box.y + box.h / 2)) - box.h / 2, 0);
        const dz = Math.max(Math.abs(o.z + 0.8 - (pStart + pEnd) / 2) - (pEnd - pStart) / 2, 0);
        const hit = dx * dx + dy * dy + dz * dz <= DRONE_RADIUS * DRONE_RADIUS;
        if (hit) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
          break;
        }
        if (!ctx.nearMissed.has(o.id)) {
          const gap = Math.abs(ox - box.x) - (HALF_W + DRONE_RADIUS);
          if (gap >= 0 && gap <= NEAR_MISS_MARGIN) {
            ctx.nearMissed.add(o.id);
            events.push({ kind: 'nearMiss', obstacleId: o.id });
          }
        }
        break;
      }
      case 'laser': {
        // Toggles on 1.2 s / off 1.2 s (phase); spans all lanes at y 0.5–1.4.
        if (!zOverlap(o.z, o.z + 0.3, pStart, pEnd)) break;
        const st = laserState(o, ctx.time);
        // Harmful only if the beam core (0.9–1.4) overlaps the player box:
        // slide (top 0.8) passes under, jump (y > 1.4) passes over.
        const verticalOverlap = box.y < LASER_Y1 && box.y + box.h > LASER_Y0_HARMFUL;
        if (st.on && verticalOverlap) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
        }
        break;
      }
      case 'wallBlock': {
        // Only harms a player running on the same wall side in the same row.
        if (!state.isWallRunning || state.wallSide !== o.side || state.wallRow !== o.row) break;
        if (zOverlap(o.z, o.z + o.len, pStart, pEnd)) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
        }
        break;
      }
      case 'rival': {
        // Rival light cycle: moves at 60% of player speed in its lane, length
        // 2.2 m, tall — only a lane change avoids it (SPEC §5.2).
        // Deterministic position: the rival is at o.z when the player is at
        // o.z and moves forward at 0.6 × player speed, so the player (faster)
        // meets it exactly at o.z. rivalZ = o.z + 0.6·(dist − o.z).
        const rivalZ = o.z + o.speedFactor * (dist - o.z);
        if (!zOverlap(rivalZ, rivalZ + 2.2, pStart, pEnd)) break;
        const ox = laneX(o.lane);
        const inLane = lateralGap(box.x, ox) < 0;
        if (inLane) {
          if (!invulnerable) events.push({ kind: 'hit', obstacleId: o.id });
          break;
        }
        if (!ctx.nearMissed.has(o.id)) {
          const gap = lateralGap(box.x, ox);
          if (gap >= 0 && gap <= NEAR_MISS_MARGIN) {
            ctx.nearMissed.add(o.id);
            events.push({ kind: 'nearMiss', obstacleId: o.id });
          }
        }
        break;
      }
      // gap / longGap: handled by player.ts (fall rule).
      default:
        break;
    }
  }
  return events;
}
