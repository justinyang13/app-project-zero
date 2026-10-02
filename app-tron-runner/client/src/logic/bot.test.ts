// Headless full-level simulation with the bot (SPEC §12).
import { describe, it, expect } from 'vitest';
import { buildLevel } from './level';
import { createPlayerState, stepPlayer, IDLE_ACTIONS, type PlayerActions } from './player';
import { checkCollisions, createCollisionCtx } from './collision';
import {
  createScoreState, addBit, addCore, addDistance, addNearMiss, addBoost,
  addVictoryBonus, applyHit as applyScoreHit
} from './scoring';
import { isGapAt, firstSolidFloorAfter, wallStripAt } from './levelTypes';
import { sectionSpeedAt, TARGET_SCORE, MAX_INTEGRITY } from '../config';
import { createBot, botActions } from './bot';
import { boltHitsPlayer, createBossState } from './boss';

const DT = 1 / 120;
const FINISH = 7800;

export interface SimResult {
  reachedDist: number;
  integrity: number;
  firstHit: { z: number; type: string } | null;
  score: number;
  hits: number;
  time: number;
}

export function simulateBot(level: ReturnType<typeof buildLevel>): SimResult {
  const player = createPlayerState();
  const bot = createBot();
  const ctx = createCollisionCtx();
  const score = createScoreState();
  const bossState = createBossState();
  let dist = 0;
  let time = 0;
  let firstHit: { z: number; type: string } | null = null;
  let hits = 0;

  while (dist < FINISH && player.integrity > 0) {
    const speed = sectionSpeedAt(dist) * player.speedMultiplier;
    const mode: 'runner' | 'cycle' = dist >= 3700 && dist < 5000 ? 'cycle' : 'runner';
    const env = {
      isGapAt: (z: number) => isGapAt(level, z),
      wallStripAt: (z: number, side: number) => wallStripAt(level, z, side as -1 | 1),
      firstSolidFloorAfter: (z: number) => firstSolidFloorAfter(level, z),
      speed,
      mode,
    };

    const actions: PlayerActions = botActions(bot, player, level, dist, time);
    player.vz = -speed;
    const prevDist = dist;
    stepPlayer(player, actions, DT, env);
    dist = -player.z;
    time += DT;
    ctx.time = time;

    const events = checkCollisions(player, prevDist, dist, level, ctx);
    for (const e of events) {
      switch (e.kind) {
        case 'hit': {
          hits += 1;
          if (!firstHit) {
            const o = level.obstacles.find((ob) => ob.id === e.obstacleId);
            firstHit = { z: dist, type: o ? o.type : 'unknown' };
          }
          player.integrity = Math.max(0, player.integrity - 1);
          player.speedMultiplier = 0.65;
          player.invulnerabilityTimer = 2.0;
          applyScoreHit(score);
          break;
        }
        case 'nearMiss':
          addNearMiss(score);
          break;
        case 'bit':
          addBit(score);
          break;
        case 'core':
          addCore(score);
          break;
        case 'repair':
          player.integrity = Math.min(MAX_INTEGRITY, player.integrity + 1);
          break;
        case 'boost':
          addBoost(score);
          break;
        default:
          break;
      }
    }

    // Boss bolt hits (section 6).
    if (dist >= 6700 && dist < 7700 && player.invulnerabilityTimer <= 0) {
      if (boltHitsPlayer(dist, player.lane, player.y, bossState)) {
        hits += 1;
        if (!firstHit) firstHit = { z: dist, type: 'bossBolt' };
        player.integrity = Math.max(0, player.integrity - 1);
        player.speedMultiplier = 0.65;
        player.invulnerabilityTimer = 2.0;
        applyScoreHit(score);
      }
    }

    addDistance(score, dist - prevDist);
  }

  if (dist >= FINISH) {
    addVictoryBonus(score, player.integrity, time);
  }

  return {
    reachedDist: dist,
    integrity: player.integrity,
    firstHit,
    score: Math.round(score.score),
    hits,
    time,
  };
}

describe('bot headless full-level simulation', () => {
  const level = buildLevel();

  it('reaches the finish (7800 m)', () => {
    const r = simulateBot(level);
    if (r.reachedDist < FINISH) {
      throw new Error(
        `Bot stopped at ${r.reachedDist.toFixed(1)} m, integrity ${r.integrity}, ` +
        `first hit: ${r.firstHit ? `${r.firstHit.type} @ ${r.firstHit.z.toFixed(1)}` : 'none'}`
      );
    }
  }, 60000);

  it('finishes with full integrity (3)', () => {
    const r = simulateBot(level);
    expect(r.reachedDist).toBeGreaterThanOrEqual(FINISH);
    expect(r.integrity).toBe(3);
    if (r.firstHit) {
      throw new Error(`Bot took a hit: ${r.firstHit.type} @ ${r.firstHit.z.toFixed(1)} m`);
    }
  }, 60000);

  it('scores at least 50% of TARGET_SCORE', () => {
    const r = simulateBot(level);
    expect(r.reachedDist).toBeGreaterThanOrEqual(FINISH);
    expect(r.score).toBeGreaterThanOrEqual(0.5 * TARGET_SCORE);
  }, 60000);

  it('finishes in 4.5–5.5 minutes (SPEC §13.3)', () => {
    const r = simulateBot(level);
    expect(r.reachedDist).toBeGreaterThanOrEqual(FINISH);
    expect(r.time).toBeGreaterThanOrEqual(4.5 * 60);
    expect(r.time).toBeLessThanOrEqual(5.5 * 60);
  }, 60000);

  it('is deterministic (two runs give identical results)', () => {
    const a = simulateBot(level);
    const b = simulateBot(level);
    expect(a.reachedDist).toBe(b.reachedDist);
    expect(a.integrity).toBe(b.integrity);
    expect(a.score).toBe(b.score);
    expect(a.hits).toBe(b.hits);
  }, 120000);
});

describe('bot unit behaviour', () => {
  it('createBot returns a fresh bot with idle-safe timers', () => {
    const b = createBot();
    expect(b.lastLanePress).toBeLessThan(0);
    expect(b.lastJump).toBeLessThan(0);
    expect(b.lastSlide).toBeLessThan(0);
  });

  it('emits idle actions with no obstacles ahead', () => {
    const level = buildLevel();
    const player = createPlayerState();
    const bot = createBot();
    // At dist 10 there are no obstacles yet (first content ~40 m).
    const a = botActions(bot, player, level, 10, 0);
    expect(a).toEqual(IDLE_ACTIONS);
  });
});
