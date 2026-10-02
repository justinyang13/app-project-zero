// Solvability checker (M4b2) — abstract DP over hazard clusters.
// Pure TS, no three/DOM imports.
//
// Algorithm (decided, do not redesign):
//  1. Collect harmful obstacles sorted by z; group into clusters whose z
//     ranges are within CLUSTER_GAP (6 m) of each other.
//  2. State = floor lane in {-1, 0, 1}. Start reachable = all three lanes.
//  3. Between clusters: lane a can reach lane b if |a-b| * LANE_COST (4 m)
//     <= distance between the clusters.
//     A lane survives a cluster if no obstacle kills it (block, or longGap
//     without a covering wall strip) and the required clearing actions
//     (jump / slide) in that lane are compatible: a jump and a slide within
//     ACTION_CONFLICT (4 m) of each other in the same lane is dead.
//  4. If the reachable set becomes empty the level is not solvable.

import type { Lane, Level, Obstacle } from './levelTypes';
import { obstacleSpan, wallStripAt } from './levelTypes';

export interface Blocker {
  z: number;
  reason: string;
}

const LANES: Lane[] = [-1, 0, 1];
const CLUSTER_GAP = 6; // m between obstacle spans to merge clusters
const LANE_COST = 4; // m of travel per lane change (~0.14 s at 28 m/s)
const ACTION_CONFLICT = 4; // m: jump+slide closer than this in one lane is dead

const HARMFUL = new Set<Obstacle['type']>([
  'barrier', 'beam', 'block', 'gap', 'longGap',
  'drone', 'laser', 'rival',
]);

/** Obstacles that affect the floor (wallBlock lives on the wall, not the floor). */
function isFloorHazard(o: Obstacle): boolean {
  return HARMFUL.has(o.type) && o.type !== 'wallBlock';
}

/** Does this obstacle touch the given floor lane? */
function touchesLane(o: Obstacle, lane: Lane): boolean {
  switch (o.type) {
    case 'barrier':
    case 'block':
    case 'drone':
    case 'rival':
      return o.lane === lane;
    case 'beam':
      return o.lane === 'all' || o.lane === lane;
    case 'gap':
    case 'longGap':
    case 'laser':
      return true; // spans all lanes
    default:
      return false;
  }
}

/** Clearing action required for a lane-touching obstacle, or 'dead'.
 * Timed obstacles (drone, laser) are always passable: the player can wait
 * for the laser's off window or jump the drone's patrol, so they never
 * force a lane change and never conflict with each other. */
function requiredAction(o: Obstacle, level: Level): 'jump' | 'slide' | 'dead' {
  switch (o.type) {
    case 'barrier':
    case 'gap':
      return 'jump';
    case 'drone': // jump over (top 1.7 m) or time the patrol
    case 'laser': // slide under, or cross during the off window
      return 'jump'; // passable — treated as non-conflicting
    case 'beam':
      return 'slide';
    case 'block':
    case 'rival': // tall — lane change only
      return 'dead';
    case 'longGap':
      // passable only if a wall strip covers the gap (wall-run)
      return wallStripAt(level, o.z, -1) || wallStripAt(level, o.z, 1)
        ? 'jump' // treated as passable via wall
        : 'dead';
    default:
      return 'dead';
  }
}

/**
 * Wall-run solvability: every wallBlock must leave the opposite row free
 * (the player can switch rows) and must sit inside a wall strip.
 * Returns null if all wallBlocks are passable, else a blocker.
 */
export function findWallBlocker(level: Level): Blocker | null {
  const wallBlocks = level.obstacles.filter((o) => o.type === 'wallBlock');
  for (const o of wallBlocks) {
    if (!wallStripAt(level, o.z, o.side)) {
      return { z: o.z, reason: `wallBlock at z=${o.z} side ${o.side} has no wall strip` };
    }
    // The other row must be free across the block's span (row switch possible).
    const otherRow = o.row === 'low' ? 'high' : 'low';
    const blocked = level.obstacles.some((b) =>
      b.type === 'wallBlock' && b.side === o.side && b.row === otherRow &&
      b.z < o.z + o.len && b.z + b.len > o.z);
    if (blocked) {
      return { z: o.z, reason: `wallBlock at z=${o.z} side ${o.side} row ${o.row} blocks both rows` };
    }
  }
  return null;
}

interface Cluster {
  z0: number;
  z1: number;
  obstacles: Obstacle[];
}

function buildClusters(level: Level): Cluster[] {
  const hazards = level.obstacles.filter(isFloorHazard);
  const clusters: Cluster[] = [];
  for (const o of hazards) {
    const [s0, s1] = obstacleSpan(o);
    const last = clusters[clusters.length - 1];
    if (last && s0 <= last.z1 + CLUSTER_GAP) {
      last.z1 = Math.max(last.z1, s1);
      last.obstacles.push(o);
    } else {
      clusters.push({ z0: s0, z1: s1, obstacles: [o] });
    }
  }
  return clusters;
}

function filterLanes(
  reachable: Set<Lane>,
  cluster: Cluster,
  level: Level,
): Set<Lane> | null {
  const out = new Set<Lane>();
  for (const lane of reachable) {
    if (laneSurvives(lane, cluster, level)) out.add(lane);
  }
  return out.size > 0 ? out : null;
}

function laneSurvives(lane: Lane, cluster: Cluster, level: Level): boolean {
  const touching = cluster.obstacles.filter((o) => touchesLane(o, lane));
  if (touching.length === 0) return true;

  const jumps: number[] = [];
  const slides: number[] = [];
  for (const o of touching) {
    const action = requiredAction(o, level);
    if (action === 'dead') return false;
    const z = obstacleSpan(o)[0];
    if (action === 'jump') jumps.push(z);
    else slides.push(z);
  }
  // A jump and a slide within ACTION_CONFLICT m in the same lane is dead.
  for (const j of jumps) {
    for (const s of slides) {
      if (Math.abs(j - s) < ACTION_CONFLICT) return false;
    }
  }
  return true;
}

/**
 * True if a collision-free path exists for the whole level (floor lanes and
 * wall rows). Timed obstacles (drone/laser) are always passable by timing.
 */
export function isLevelSolvable(level: Level): boolean {
  return findFirstBlocker(level) === null && findWallBlocker(level) === null;
}

/**
 * First cluster that makes the level unsolvable, or null if solvable.
 */
export function findFirstBlocker(level: Level): Blocker | null {
  const clusters = buildClusters(level);
  let reachable = new Set<Lane>(LANES);
  let prevZ1 = -Infinity;

  for (const cluster of clusters) {
    const gap = cluster.z0 - prevZ1;
    // Lane-change reachability: |a-b| * LANE_COST <= gap.
    const moved = new Set<Lane>();
    for (const a of reachable) {
      for (const b of LANES) {
        if (Math.abs(a - b) * LANE_COST <= gap) moved.add(b);
      }
    }
    const after = filterLanes(moved, cluster, level);
    if (after === null) {
      return {
        z: cluster.z0,
        reason: `no lane survives cluster at z=${cluster.z0} (gap=${gap.toFixed(1)} m)`,
      };
    }
    reachable = after;
    prevZ1 = cluster.z1;
  }
  return null;
}
