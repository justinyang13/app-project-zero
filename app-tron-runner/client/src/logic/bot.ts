// Bot: pure, deterministic auto-pilot (SPEC §12).
// No three/DOM imports. Drives the player via edge-triggered PlayerActions.

import type { PlayerState, PlayerActions } from './player';
import { IDLE_ACTIONS, modeAt } from './player';
import type { Level, Obstacle } from './levelTypes';
import { obstaclesInRange, wallStripAt } from './levelTypes';
import { activeTelegraph, boltPosition, createBossState } from './boss';
import { sectionSpeedAt } from '../config';

export interface Bot {
  lastLanePress: number;
  lastJump: number;
  lastSlide: number;
  lastWallEnter: number;
  lastWallDrop: number;
  lastRowSwitch: number;
  bossState: ReturnType<typeof createBossState>;
}

export function createBot(): Bot {
  return {
    lastLanePress: -10,
    lastJump: -10,
    lastSlide: -10,
    lastWallEnter: -10,
    lastWallDrop: -10,
    lastRowSwitch: -10,
    bossState: createBossState(),
  };
}

const LANE_RATE = 0.25;
const JUMP_RATE = 0.3;
const SLIDE_RATE = 0.3;
const WALL_RATE = 0.3;
const ROW_RATE = 0.3;

function laneOf(o: Obstacle): number | 'all' | null {
  // Lasers, gaps, longGaps span all lanes.
  if (o.type === 'laser' || o.type === 'gap' || o.type === 'longGap') return 'all';
  const any = o as { lane?: number | 'all' };
  return any.lane !== undefined ? any.lane : null;
}

function inLane(o: Obstacle, lane: number): boolean {
  const l = laneOf(o);
  return l === 'all' || l === lane;
}

/** Cost of a lane: high if blocked, medium if hazards, low if bits. */
function laneCost(level: Level, dist: number, lookahead: number, lane: number): number {
  const mode = modeAt(dist);
  // Include a 3m buffer behind so we don't move into a lane with a beam just passed.
  const obs = obstaclesInRange(level, Math.max(0, dist - 3), dist + lookahead);
  let cost = 0;
  for (const o of obs) {
    if (!inLane(o, lane)) continue;
    switch (o.type) {
      case 'block':
      case 'rival':
        cost += 1000;
        break;
      case 'barrier':
      case 'drone':
        cost += 5;
        break;
      case 'beam':
        // In cycle mode, beams can't be jumped or slid — must change lane.
        cost += (mode === 'cycle') ? 1000 : 5;
        break;
      // Laser spans all lanes — handled by sliding, not lane change.
      case 'laser':
        break;
      case 'gap':
      case 'longGap':
        cost += 2;
        break;
      case 'bit':
        cost -= 0.3;
        break;
      case 'boost':
        cost -= 0.5;
        break;
      case 'core':
        cost -= 1;
        break;
      case 'repair':
        cost -= 0.5;
        break;
      default:
        break;
    }
  }
  cost += 0.8 * Math.abs(lane);
  return cost;
}

/** Find the nearest obstacle of given types in a lane ahead. */
function nearestInLane(
  level: Level, dist: number, lookahead: number,
  types: string[], lane: number
): Obstacle | null {
  const obs = obstaclesInRange(level, dist, dist + lookahead);
  let best: Obstacle | null = null;
  let bestD = Infinity;
  for (const o of obs) {
    if (!types.includes(o.type)) continue;
    if (!inLane(o, lane)) continue;
    const d = o.z - dist;
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

/** Find the nearest gap/longGap ahead (any lane). */
function nearestGap(level: Level, dist: number, lookahead: number): Obstacle | null {
  const obs = obstaclesInRange(level, dist, dist + lookahead);
  let best: Obstacle | null = null;
  let bestD = Infinity;
  for (const o of obs) {
    if (o.type !== 'gap' && o.type !== 'longGap') continue;
    const d = o.z - dist;
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

/** Find the longGap ahead and its wall strip side. */
function findLongGap(level: Level, dist: number, lookahead: number): { z: number; side: -1 | 1 } | null {
  const obs = obstaclesInRange(level, dist, dist + lookahead);
  for (const o of obs) {
    if (o.type === 'longGap') {
      const gap = o as { z: number; len: number };
      const midZ = gap.z + gap.len / 2;
      if (wallStripAt(level, midZ, -1)) return { z: gap.z, side: -1 };
      if (wallStripAt(level, midZ, 1)) return { z: gap.z, side: 1 };
    }
  }
  return null;
}

/** Find a wallBlock on the given wall side and row ahead. */
function findWallBlock(level: Level, dist: number, lookahead: number, side: number, row: string): Obstacle | null {
  const obs = obstaclesInRange(level, dist, dist + lookahead);
  for (const o of obs) {
    if (o.type === 'wallBlock') {
      const wb = o as { side: number; row: string };
      if (wb.side === side && wb.row === row) return o;
    }
  }
  return null;
}

export function botActions(
  bot: Bot,
  state: PlayerState,
  level: Level,
  dist: number,
  simTime: number
): PlayerActions {
  const actions: PlayerActions = { ...IDLE_ACTIONS };
  const speed = sectionSpeedAt(dist);
  const lookahead = Math.max(speed * 1.3, 15);
  const mode = modeAt(dist);

  // ---- Boss avoidance (section 6) ------------------------------------------
  if (dist >= 6700 && dist < 7700 && !state.isWallRunning) {
    // Phase 1: Telegraph — change lane to a safe one.
    const telegraph = activeTelegraph(dist, bot.bossState);
    if (telegraph) {
      const inDanger = telegraph.lanes.some((l) => l === state.lane);
      if (inDanger && state.isGrounded && !state.isJumping) {
        const safeLanes = [-1, 0, 1].filter((l) => !telegraph.lanes.includes(l as -1 | 0 | 1));
        const blockFree = safeLanes.filter((l) => {
          const obs = obstaclesInRange(level, Math.max(0, dist - 2), dist + 2);
          return !obs.some((o) => o.type === 'block' && (o as any).lane === l);
        });
        if (blockFree.length > 0 && simTime - bot.lastLanePress > LANE_RATE) {
          const target = blockFree[0];
          if (target > state.lane) actions.right = true;
          else if (target < state.lane) actions.left = true;
          bot.lastLanePress = simTime;
        }
      }
    }

    // Phase 2: Bolt in flight — jump if in the telegraphed lane.
    const bolt = boltPosition(dist, bot.bossState);
    if (bolt && state.isGrounded && !state.isJumping) {
      const inBoltLane = bolt.lanes.some((l) => l === state.lane);
      if (inBoltLane && simTime - bot.lastJump > JUMP_RATE) {
        actions.jump = true;
        bot.lastJump = simTime;
      }
    }

  }

  // ---- Wall-run logic (runner only) -----------------------------------------
  if (mode === 'runner') {
    if (state.isWallRunning) {
      // On the wall: switch row if wallBlock ahead in current row.
      const wb = findWallBlock(level, dist, lookahead, state.wallSide, state.wallRow);
      if (wb && simTime - bot.lastRowSwitch > ROW_RATE) {
        if (state.wallRow === 'low') actions.jump = true;
        else actions.slide = true;
        bot.lastRowSwitch = simTime;
      }
      // Drop off the wall once past the longGap.
      const lg = findLongGap(level, dist - 60, 120);
      if (lg && dist > lg.z + 30 && simTime - bot.lastWallDrop > WALL_RATE) {
        if (state.wallSide === 1) actions.left = true;
        else actions.right = true;
        bot.lastWallDrop = simTime;
      }
      return actions;
    }

    // Check for longGap ahead → enter wall.
    const lg = findLongGap(level, dist, lookahead + 30);
    if (lg) {
      const side = lg.side;
      const targetLane = side;
      if (state.lane !== targetLane) {
        if (targetLane > state.lane && simTime - bot.lastLanePress > LANE_RATE) {
          actions.right = true;
          bot.lastLanePress = simTime;
        } else if (targetLane < state.lane && simTime - bot.lastLanePress > LANE_RATE) {
          actions.left = true;
          bot.lastLanePress = simTime;
        }
      } else if (state.isGrounded && simTime - bot.lastWallEnter > WALL_RATE) {
        if (side === 1) actions.right = true;
        else actions.left = true;
        bot.lastWallEnter = simTime;
      }
      return actions;
    }
  }

  if (state.isWallRunning) return actions;

  // Skip lane selection during boss danger (telegraph or bolt in our lane).
  const bossBolt = dist >= 6700 && dist < 7700 ? boltPosition(dist, bot.bossState) : null;
  const bossTele = dist >= 6700 && dist < 7700 ? activeTelegraph(dist, bot.bossState) : null;
  const inBossDanger = (bossTele !== null || bossBolt !== null);

  if (!inBossDanger) {
  // ---- Lane selection --------------------------------------------------------
  // Compute cost for each lane; prefer the cheapest.
  const lanes = [-1, 0, 1];
  let bestLane = state.lane;
  let bestCost = Infinity;
  const costs: Record<number, number> = {};
  for (const lane of lanes) {
    const c = laneCost(level, dist, lookahead, lane);
    costs[lane] = c;
    if (c < bestCost) { bestCost = c; bestLane = lane; }
  }


  // Current lane cost for comparison.
  const currentCost = laneCost(level, dist, lookahead, state.lane);

  // Move toward best lane if it's significantly better (or current is dangerous).
  if (bestLane !== state.lane && simTime - bot.lastLanePress > LANE_RATE) {
    const improvement = currentCost - bestCost;
    // Move if current lane is dangerous (> 4) or best lane is clearly better.
    if (currentCost > 4 || improvement > 2) {
      if (bestLane > state.lane) actions.right = true;
      else actions.left = true;
      bot.lastLanePress = simTime;
    }
  }
  } // end if (!inBossDanger)

  // ---- Hazard response in the current lane ----------------------------------
  const lane = state.lane;

  // Barrier: jump.
  const barrier = nearestInLane(level, dist, lookahead, ['barrier'], lane);
  if (barrier && state.isGrounded && !state.isJumping && simTime - bot.lastJump > JUMP_RATE) {
    const d = barrier.z - dist;
    if (d <= speed * 0.30) {
      actions.jump = true;
      bot.lastJump = simTime;
    }
  }

  // Gap: jump (only regular gaps, not longGap).
  const gap = nearestGap(level, dist, lookahead);
  if (gap && gap.type === 'gap' && state.isGrounded && !state.isJumping && simTime - bot.lastJump > JUMP_RATE) {
    const d = gap.z - dist;
    if (d <= speed * 0.30) {
      actions.jump = true;
      bot.lastJump = simTime;
    }
  }

  // Beam: slide (runner only; in cycle mode the lane selection should avoid it).
  if (mode === 'runner') {
    const beam = nearestInLane(level, dist, lookahead, ['beam'], lane);
    if (beam && state.isGrounded && !state.isSliding && simTime - bot.lastSlide > SLIDE_RATE) {
      const d = beam.z - dist;
      if (d <= speed * 0.25) {
        actions.slide = true;
        bot.lastSlide = simTime;
      }
    }

    // Laser: slide.
    const laser = nearestInLane(level, dist, lookahead, ['laser'], lane);
    if (laser && state.isGrounded && !state.isSliding && simTime - bot.lastSlide > SLIDE_RATE) {
      const d = laser.z - dist;
      if (d <= speed * 0.25) {
        actions.slide = true;
        bot.lastSlide = simTime;
      }
    }
  }

  // Drone: jump over it (apex 2.7 m clears drone top 1.7 m).
  // Drones patrol laterally across the full track, so always jump when in range.
  const drone = nearestInLane(level, dist, lookahead, ['drone'], 0) ??
    nearestInLane(level, dist, lookahead, ['drone'], -1) ??
    nearestInLane(level, dist, lookahead, ['drone'], 1);
  if (drone && state.isGrounded && !state.isJumping && simTime - bot.lastJump > JUMP_RATE) {
    const d = drone.z - dist;
    if (d <= speed * 0.35) {
      actions.jump = true;
      bot.lastJump = simTime;
    }
  }

  // Rival: change lane (jump is not enough in cycle mode).
  const rival = nearestInLane(level, dist, lookahead, ['rival'], lane);
  if (rival && simTime - bot.lastLanePress > LANE_RATE) {
    const d = rival.z - dist;
    if (d <= lookahead) {
      // Move to an adjacent safe lane.
      const target = lane === 0 ? 1 : lane === 1 ? 0 : 0;
      if (target > lane) actions.right = true;
      else actions.left = true;
      bot.lastLanePress = simTime;
    }
  }

  return actions;
}
